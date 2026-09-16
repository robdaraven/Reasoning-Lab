# Robbie Agent

A minimal Python agent starter project.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install pytest
```

## Run tests

```bash
pytest -q
```

## Example usage

```python
from agent_app.agent import TaskAgent

agent = TaskAgent()
print(agent.run("Plan a trip to Paris with a budget and timeline."))
```
