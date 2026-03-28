# Accord-Project
A basic visualisation of how the agentic ai workflow would look like.
Follow the following steps to get the output in the terminal of your labtop:
1. Setup Env
   
   python3 -m venv venv

   source venv/bin/activate

   pip install -r requirements.txt

   cp .env.example .env

2. Add API Keys
Open `.env` and paste your key for the model you wish to use (Google, Anthropic, or OpenAI).

3. Run the CLI

   python cli.py "A Non-disclosure agreement for 12 months..." --model gemini

To check the frontend follow the following steps:

1. Run the API server:
uvicorn app:app --reload

2. Open the Dashboard: Go to http://127.0.0.1:8000 in your browser, select your AI model, enter a requirement and done!


