from agent_app.agent import TaskAgent


def test_agent_builds_a_plan_for_tasks():
    agent = TaskAgent()

    result = agent.run("Plan a trip to Paris with a budget and timeline.")

    assert result["status"] == "ok"
    assert len(result["plan"]) >= 3
    assert "paris" in result["summary"].lower()


def test_agent_remembers_context():
    agent = TaskAgent()

    first = agent.run("Remember that my project is to build a website for my bakery.")
    second = agent.run("What do you remember about my project?")

    assert first["status"] == "ok"
    assert "bakery" in second["summary"].lower()
    assert any("bakery" in item.lower() for item in agent.memory)
