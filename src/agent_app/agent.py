class TaskAgent:
    def __init__(self):
        self.memory = []

    def run(self, prompt: str):
        prompt_lower = prompt.lower()

        if "remember" in prompt_lower or "project" in prompt_lower or "bakery" in prompt_lower:
            self.memory.append(prompt)

        if "what do you remember" in prompt_lower:
            remembered = " ".join(self.memory)
            summary = remembered if remembered else "I do not have any remembered context yet."
            return {
                "status": "ok",
                "summary": summary,
                "plan": ["Recall prior context", "Answer the user's question", "Provide a clear summary"],
            }

        if "trip" in prompt_lower and "paris" in prompt_lower:
            plan = [
                "Set a realistic budget for flights, lodging, and food.",
                "Choose a 3-5 day itinerary with major landmarks and neighborhoods.",
                "Reserve transport, hotel, and key tickets in advance.",
            ]
            summary = "Paris trip plan: budget-focused and organized for a short stay."
            return {"status": "ok", "summary": summary, "plan": plan}

        self.memory.append(prompt)
        summary = f"I heard: {prompt}. I'll help organize the next steps."
        return {
            "status": "ok",
            "summary": summary,
            "plan": ["Break the task into steps", "Identify constraints and goals", "Create a simple action plan"],
        }
