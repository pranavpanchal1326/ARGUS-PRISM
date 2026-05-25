"""
conftest.py — src/tests/
Adds all engine source paths to sys.path so pytest and
the IDE (Pylance/Pyright) resolve imports without red lines.
"""
import sys
import os

# Repo root = two levels up from src/tests/
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# All engine source paths
PATHS = [
    os.path.join(REPO, 'services', 'pipeline'),   # config, kafka_producer, graph_writer
    os.path.join(REPO, 'src', 'flowgraph'),        # detectors, detector_runner
    os.path.join(REPO, 'src', 'taint'),            # taint_engine
    os.path.join(REPO, 'src', 'recruiter'),        # recruiter_detector
    os.path.join(REPO, 'src', 'warmthscore'),      # warmth_engine
]

for p in PATHS:
    if p not in sys.path:
        sys.path.insert(0, p)
