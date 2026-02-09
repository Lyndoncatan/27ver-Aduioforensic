FROM python:3.9

WORKDIR /code

# Install system dependencies for audio processing
RUN apt-get update && apt-get install -y ffmpeg

COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

COPY . .

# Hugging Face Spaces requires port 7860
# Streamlit runs on port 8501 by default, but we can configure it
CMD ["streamlit", "run", "app.py", "--server.port=7860", "--server.address=0.0.0.0"]
