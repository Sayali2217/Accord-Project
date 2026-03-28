import argparse
import os
import sys

from crewai import Agent, Task, Crew, Process
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_llm(model_name):
    """Factory to get the right LLM based on user selection"""
    if model_name == "claude":
        if not os.getenv("ANTHROPIC_API_KEY"):
            print("Error: ANTHROPIC_API_KEY is missing from environment or .env file.")
            sys.exit(1)
        return "anthropic/claude-3-5-sonnet-20241022"
    elif model_name == "gpt-4":
        if not os.getenv("OPENAI_API_KEY"):
            print("Error: OPENAI_API_KEY is missing from environment or .env file.")
            sys.exit(1)
        return "openai/gpt-4o"
    elif model_name == "gemini":
        if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
            print("Error: GOOGLE_API_KEY or GEMINI_API_KEY is missing from environment or .env file.")
            sys.exit(1)
        # liteLLM usually checks GEMINI_API_KEY, let's map it if needed
        if os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
            os.environ["GEMINI_API_KEY"] = os.getenv("GOOGLE_API_KEY")
        return "gemini/gemini-2.5-flash"
    else:
        print(f"Unknown model: {model_name}")
        sys.exit(1)

def run_agent_pipeline(input_text, model_name="gemini"):
    print(f"Initializing CrewAI with model: {model_name}")
    llm = get_llm(model_name)

    # ==========================
    # 1. Define Agents (Who)
    # ==========================
    legal_expert = Agent(
        role="Legal Expert",
        goal="Interpret user requirements and structure the legal clauses and variables.",
        backstory="An expert contract lawyer who specializes in strictly defining obligations, parties, and data variables for legal tech platforms like Accord Project.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

    template_writer = Agent(
        role="Template Writer",
        goal="Draft Accord Project model.cto, text grammar.tem, and logic.ergo based on legal analysis.",
        backstory="A developer specializing in Accord Project's ecosystem (Concerto, CiceroMark, Ergo) who turns legal analysis into deployable templates.",
        verbose=True,
        allow_delegation=False,
        llm=llm
    )

    validator = Agent(
        role="Validator",
        goal="Validate drafted templates for logic, grammar completeness, and correct data types.",
        backstory="A precise QA tool and logic validator. You check if the model.cto matches the grammar variables, and if the logic.ergo makes logical sense.",
        verbose=True,
        allow_delegation=False, 
        llm=llm
    )

    # ==========================
    # 2. Define Tasks (What)
    # ==========================
    task1 = Task(
        description=f"Analyze the following legal requirement: '{input_text}'. Extract parties, core clauses, variable names, and expected data types. Output a structured JSON or markdown analysis.",
        expected_output="A structured list of parties, contract variables, and clauses.",
        agent=legal_expert
    )

    task2 = Task(
        description="Using the analysis provided by the Legal Expert, draft three files: 1) A Concerto model (.cto) with variables, 2) A CiceroMark text grammar template mapping those variables, 3) An Ergo logic contract. Be precise and provide the raw code blocks.",
        expected_output="Three code blocks representing the model.cto, text grammar.tem, and logic.ergo files.",
        agent=template_writer,
        context=[task1] 
    )

    task3 = Task(
        description="Verify the output of the Template Writer. Ensure that ALL variables in the grammar exist in the model. Ensure the Ergo logic namespace matches the model. If there are errors, describe what needs fixing for a retry. Otherwise, output the final 'Validated template'.",
        expected_output="A validation report followed by the final finalized 'Validated template' containing the three files.",
        agent=validator,
        context=[task2]
    )

    # ==========================
    # 3. Crew Orchestration (Runtime)
    # ==========================
    crew = Crew(
        agents=[legal_expert, template_writer, validator],
        tasks=[task1, task2, task3],
        process=Process.sequential,
        verbose=True,
        memory=False
    )

    print("Kicking off the Agent Crew...")
    try:
        max_retries = 3
        attempt = 1
        
        result = crew.kickoff()
        
        while "FAIL" in str(result).upper() and attempt < max_retries:
            print(f"\\n--- Validation failed. Retrying (Attempt {attempt+1}/{max_retries}) ---")
            retry_task = Task(
                description=f"The validator found errors: {result}. Fix the model, grammar, and logic files. Produce the updated code blocks.",
                expected_output="The corrected model.cto, text grammar.tem, and logic.ergo files.",
                agent=template_writer
            )
            reval_task = Task(
                description="Validate the newly adjusted drafted templates for logic, grammar completeness, and correct data types.",
                expected_output="A validation report and the final 'Validated template'.",
                agent=validator,
                context=[retry_task]
            )
            retry_crew = Crew(agents=[template_writer, validator], tasks=[retry_task, reval_task], process=Process.sequential, verbose=True)
            result = retry_crew.kickoff()
            attempt += 1

        # Extract outputs
        analysis_out = getattr(task1.output, 'raw', str(task1.output)) if hasattr(task1, 'output') and task1.output else "Analysis missing."
        draft_task = retry_task if 'retry_task' in locals() else task2
        draft_out = getattr(draft_task.output, 'raw', str(draft_task.output)) if hasattr(draft_task, 'output') and draft_task.output else "Draft missing."
        val_task = reval_task if 'reval_task' in locals() else task3
        val_out = getattr(val_task.output, 'raw', str(val_task.output)) if hasattr(val_task, 'output') and val_task.output else str(result)

        return {
            "success": True,
            "analysis": analysis_out,
            "draft_raw": draft_out,
            "validation": val_out,
            "final_result": str(result)
        }
        
    except Exception as e:
        print(f"Error during execution: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def main():
    parser = argparse.ArgumentParser(description="Accord Project - Agentic Template Generator CLI")
    parser.add_argument("input", type=str, help="Legal requirement text to parse and generate a template for")
    parser.add_argument("--model", type=str, choices=["claude", "gpt-4", "gemini"], default="gemini", 
                        help="The AI model to use for the Crew agents (default: gemini)")
    args = parser.parse_args()

    # Call the extracted pipeline
    result = run_agent_pipeline(args.input, args.model)
    
    if result.get("success"):
        print("\n==============================================")
        print("Final Output:")
        print("==============================================")
        print(result.get("final_result"))
    else:
        print(f"Pipeline failed: {result.get('error')}")

if __name__ == "__main__":
    main()
