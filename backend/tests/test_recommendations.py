import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import get_db
from app.main import app
from app.api.v1.recommendations import seed_courses_if_empty

test_engine = create_async_engine('sqlite+aiosqlite:///:memory:', echo=False)
test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with test_session() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db


async def run_recommendation_tests():
    async with test_engine.begin() as conn:
        from app.models.user import User
        from app.models.user_skill import UserSkill
        from app.models.course import Course, Enrollment
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(UserSkill.__table__.create)
        await conn.run_sync(Course.__table__.create)
        await conn.run_sync(Enrollment.__table__.create)

    # Seed initial courses
    async with test_session() as s:
        await seed_courses_if_empty(s)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        # 1. Check courses catalog
        res_courses = await client.get('/courses')
        assert res_courses.status_code == 200
        courses = res_courses.json()
        print(f"1. Courses Catalog: {len(courses)} courses loaded.")
        assert len(courses) >= 20

        # 2. Register user & submit ratings with a specific gap
        signup_res = await client.post('/auth/signup', json={
            'name': 'Officer Sunita Rao',
            'email': 'sunita.rao@mospi.gov.in',
            'password': 'SecurePass123',
            'role': 'Statistical Analyst',
            'department': 'MoSPI',
            'experience_years': 4
        })
        assert signup_res.status_code == 201
        token = signup_res.json()['access_token']
        user_id = signup_res.json()['user_id']
        headers = {'Authorization': f'Bearer {token}'}

        # Target role benchmark for Statistical Analyst has:
        # "Machine Learning & Predictive Modeling": 60 -> rate 25 (gap = 35)
        # "Survey Sampling & Methodology": 85 -> rate 45 (gap = 40)
        await client.post('/onboarding', json={
            'skills': [
                {'skill_name': 'Machine Learning & Predictive Modeling', 'domain': 'Technical', 'current_level': 25},
                {'skill_name': 'Survey Sampling & Methodology', 'domain': 'Statistical', 'current_level': 45}
            ]
        }, headers=headers)

        # 3. Fetch recommendations
        rec_res = await client.get(f'/recommendations/{user_id}')
        assert rec_res.status_code == 200, f"Recommendation failed: {rec_res.text}"
        rec_data = rec_res.json()
        print(f"2. Recommendations returned: {rec_data['total_recommendations']} courses.")
        assert rec_data['total_recommendations'] > 0

        # Check explainability string
        first_rec = rec_data['recommendations'][0]
        print(f"   Top Recommendation: '{first_rec['title']}' ({first_rec['source']})")
        print(f"   Explainability String: \"{first_rec['explanation']}\"")
        assert "Recommended because your" in first_rec['explanation']
        assert "% below the required level for Statistical Analyst" in first_rec['explanation']
        assert first_rec['is_enrolled'] is False

        # 4. Mock enroll in the course
        course_to_enroll = first_rec['id']
        enroll_res = await client.post(f'/courses/{course_to_enroll}/enroll', headers=headers)
        assert enroll_res.status_code == 201
        print(f"3. Mock Enrollment Succeeded for course '{first_rec['title']}'")

        # 5. Verify /my-enrollments
        my_enr_res = await client.get('/my-enrollments', headers=headers)
        assert my_enr_res.status_code == 200
        assert len(my_enr_res.json()) == 1
        print(f"4. /my-enrollments returned: {my_enr_res.json()[0]['course_title']}")

        # 6. Verify subsequent recommendations reflect is_enrolled: True
        rec_res2 = await client.get(f'/recommendations/{user_id}')
        rec_data2 = rec_res2.json()
        matched_enrolled = [c for c in rec_data2['recommendations'] if c['id'] == course_to_enroll][0]
        assert matched_enrolled['is_enrolled'] is True
        print(f"5. Re-check recommendation: is_enrolled is correctly {matched_enrolled['is_enrolled']}")

        print(">>> ALL PHASE 3 BACKEND RECOMMENDATION TESTS PASSED! <<<")


if __name__ == '__main__':
    asyncio.run(run_recommendation_tests())
