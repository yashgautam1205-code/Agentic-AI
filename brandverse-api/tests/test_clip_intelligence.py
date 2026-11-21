from app.services.clip_intelligence import clip_intelligence_service


def test_clip_candidates_use_actual_transcript_segments():
    segments = [
        {
            "start_time": 2.0,
            "end_time": 18.0,
            "text": "Here's the truth: most people make this mistake when they start.",
            "speaker": "Speaker 1",
            "confidence": 0.98,
        },
        {
            "start_time": 18.0,
            "end_time": 35.0,
            "text": "The key is to focus on the one thing that creates real leverage.",
            "speaker": "Speaker 1",
            "confidence": 0.96,
        },
    ]

    candidates = clip_intelligence_service.detect_candidate_clips(segments)

    assert candidates
    candidate = candidates[0]
    assert candidate["start_time"] == 2.0
    assert candidate["end_time"] >= candidate["start_time"]
    assert candidate["transcript_excerpt"].startswith("Here's the truth")
    assert 0 <= candidate["hook_strength"] <= 100
