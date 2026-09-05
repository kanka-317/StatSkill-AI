import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.core.database import Base, engine, AsyncSessionLocal
from app.core.security import create_access_token
from app.models.user import User


async def test_admin_analytics_lifecycle():
    # 1. Initialize tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Seed a standard user and an admin user
    standard_email = "regular_analyst@mospi.gov.in"
    admin_email = "cadre_director_admin@mospi.gov.in"

    async with AsyncSessionLocal() as session:
        # Standard user
        u_res = await session.execute(select(User).where(User.email == standard_email))
        standard_user = u_res.scalars().first()
        if not standard_user:
            standard_user = User(
                email=standard_email,
                name="Regular Cadre Analyst",
                role="Statistical Analyst",
                department="Price Statistics Division",
                experience_years=3,
                password_hash="fakehash",
            )
            session.add(standard_user)
        else:
            standard_user.role = "Statistical Analyst"

        # Admin user
        a_res = await session.execute(select(User).where(User.email == admin_email))
        admin_user = a_res.scalars().first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                name="Cadre Training Director",
                role="admin",
                department="NSSTA Leadership Cell",
                experience_years=15,
                password_hash="fakehash",
            )
            session.add(admin_user)
        else:
            admin_user.role = "admin"

        await session.commit()
        standard_id = standard_user.id
        admin_id = admin_user.id

    standard_token = create_access_token(subject=str(standard_id))
    admin_token = create_access_token(subject=str(admin_id))

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 3. Test Role Guard: Standard official should be forbidden (403)
        print("1. Testing role guard for standard official (role='Statistical Analyst')...")
        res_forbidden = await client.get(
            "/admin/analytics",
            headers={"Authorization": f"Bearer {standard_token}"},
        )
        assert res_forbidden.status_code == 403, (
            f"Expected 403 Forbidden, got {res_forbidden.status_code}: {res_forbidden.text}"
        )
        print("   Role guard correctly blocked non-admin request (HTTP 403).")

        # 4. Test Admin Access (200 OK)
        print("2. Testing analytics retrieval with admin privileges (role='admin')...")
        res_analytics = await client.get(
            "/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert res_analytics.status_code == 200, (
            f"Admin analytics failed: {res_analytics.status_code} {res_analytics.text}"
        )
        data = res_analytics.json()

        # 5. Validate Payload Contents
        print(f"   Total registered officials: {data['total_officials']}")
        print(f"   Org-wide avg competency: {data['avg_competency_pct']}%")
        print(f"   Org-wide avg capability gap: {data['avg_gap_pct']}%")
        assert data["total_officials"] >= 2
        assert 0 <= data["avg_competency_pct"] <= 100
        assert 0 <= data["avg_gap_pct"] <= 100

        # Department gaps
        dept_gaps = data["department_gaps"]
        assert len(dept_gaps) >= 1
        print(f"   Departments evaluated: {len(dept_gaps)}")
        for d in dept_gaps[:3]:
            print(f"     - {d['department']}: {d['avg_gap']} avg gap pts ({d['official_count']} officials)")

        # Predictive Training Demand (Top 5 Systemic Gaps)
        top_gaps = data["top_systemic_gaps"]
        assert 1 <= len(top_gaps) <= 5
        print(f"   Predictive Training Demand (Top {len(top_gaps)} Systemic Gaps):")
        for g in top_gaps:
            print(f"     * {g['skill_name']} ({g['domain']}): avg gap {g['avg_gap']} | Priority: {g['demand_priority']}")

        # Course enrollments
        enrollments = data["course_enrollments"]
        assert len(enrollments) >= 1
        print(f"   Course enrollment stats loaded: {len(enrollments)} courses tracked, total enrollments: {data['total_enrollments']}")

        # 6. Test Demo Role Toggle
        print("3. Testing demo role toggle endpoint...")
        res_toggle = await client.post(
            "/admin/demo-role-toggle",
            headers={"Authorization": f"Bearer {standard_token}"},
        )
        assert res_toggle.status_code == 200
        toggle_data = res_toggle.json()
        assert toggle_data["is_admin"] is True
        assert toggle_data["current_role"] == "admin"
        print(f"   Role successfully toggled: '{toggle_data['previous_role']}' -> '{toggle_data['current_role']}'")

    print(">>> ALL PHASE 5 BACKEND ADMIN ANALYTICS TESTS PASSED! <<<")


if __name__ == "__main__":
    asyncio.run(test_admin_analytics_lifecycle())
