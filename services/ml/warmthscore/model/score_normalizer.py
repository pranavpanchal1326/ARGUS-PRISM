"""
PRISM V1 — Score Normalizer

Provides a hard-clamped [0, 100] score normalizer as an alternative
to the non-linear mapping in predictor.py.

The predictor's _probability_to_warmthscore() is preferred for production
as it provides better score spread in the MLRO-visible range.
This module is kept as a utility for batch processing and testing.
"""


def normalize_score(raw_probability: float) -> int:
    """
    Simple linear mapping: probability [0.0, 1.0] → score [0, 100].
    Hard clamp. Always returns an integer.
    """
    score = int(round(raw_probability * 100))
    return max(0, min(100, score))


def normalize_score_float(raw_probability: float) -> float:
    """
    Simple linear mapping with float precision.
    probability [0.0, 1.0] → score [0.0, 100.0].
    """
    score = round(raw_probability * 100, 2)
    return max(0.0, min(100.0, score))
