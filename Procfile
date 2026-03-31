web: gunicorn src.task_queue:app --bind 0.0.0.0:$PORT --workers 4
worker: python src/swarm_manager.py