import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.database import get_db
from app.main import app

test_engine = create_async_engine('sqlite+aiosqlite:///:memory:', echo=False)
test_session = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

async def override_get_db():
    async with test_session() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

async def run_gap_test():
    async with test_engine.begin() as conn:
        from app.models.user import User
        from app.models.user_skill import UserSkill
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(UserSkill.__table__.create)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url='http://test') as client:
        # 1. Signup
        signup_payload = {
            'name': 'Priya Sharma, ISS',
            'email': 'priya.sharma@mospi.gov.in',
            'password': 'Password123',
            'role': 'Statistical Analyst',
            'department': 'MoSPI',
            'experience_years': 4
        }
        res_signup = await client.post('/auth/signup', json=signup_payload)
        assert res_signup.status_code == 201
        user_id = res_signup.json()['user_id']
        token = res_signup.json()['access_token']
        headers = {'Authorization': f'Bearer {token}'}

        # 2. Submit sample ratings
        onboard_payload = {
            'skills': [
                {'skill_name': 'Survey Sampling & Methodology', 'domain': 'Statistical', 'current_level': 50},
                {'skill_name': 'Python for Data Science', 'domain': 'Technical', 'current_level': 55},
                {'skill_name': 'Price Indices (CPI/WPI/IIP)', 'domain': 'Statistical', 'current_level': 80}
            ]
        }
        await client.post('/onboarding', json=onboard_payload, headers=headers)

        # 3. Fetch skill gap via /skill-gap/{user_id}
        res_gap = await client.get(f'/skill-gap/{user_id}')
        assert res_gap.status_code == 200, f'Skill gap failed: {res_gap.text}'
        gap_data = res_gap.json()

        print(f"Role: {gap_data['role']}")
        print(f"Overall Competency %: {gap_data['overall_competency_pct']}")
        print(f"Overall Gap %: {gap_data['overall_gap_pct']}")
        print(f"Total skills evaluated: {len(gap_data['skills'])}")
        print("Top Priority skills:")
        for s in gap_data['priority_skills']:
            print(f"  - {s['skill']} | gap: {s['gap']} | status: {s['status']}")

        # Verify priority status logic
        p_skill = [s for s in gap_data['skills'] if s['skill'] == 'Survey Sampling & Methodology'][0]
        assert p_skill['gap'] == 35, f"Expected gap 35, got {p_skill['gap']}"
        assert p_skill['status'] == 'priority', f"Expected priority, got {p_skill['status']}"

        m_skill = [s for s in gap_data['skills'] if s['skill'] == 'Python for Data Science'][0]
        assert m_skill['gap'] == 15, f"Expected gap 15, got {m_skill['gap']}"
        assert m_skill['status'] == 'moderate', f"Expected moderate, got {m_skill['status']}"

        t_skill = [s for s in gap_data['skills'] if s['skill'] == 'Price Indices (CPI/WPI/IIP)'][0]
        assert t_skill['gap'] == 5, f"Expected gap 5, got {t_skill['gap']}"
        assert t_skill['status'] == 'on track', f"Expected on track, got {t_skill['status']}"

        print(">>> ALL PHASE 2 BACKEND GAP ASSERTIONS PASSED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    asyncio.run(run_gap_test())
