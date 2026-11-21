import re
from typing import List, Dict, Any


class ClipIntelligenceService:
    def detect_candidate_clips(self, segments: List[Dict[str, Any]], language: str = "English") -> List[Dict[str, Any]]:
        """Generate candidates from transcript boundaries and content signals."""
        if not segments:
            return []

        candidates = []
        signal_words = (
            "most", "never", "always", "why", "how", "secret", "wrong",
            "mistake", "important", "key", "biggest", "instead", "real",
            "one", "fact", "truth", "exactly",
        )
        hook_words = ("here's", "nobody", "people", "everyone", "truth", "wrong", "mistake")

        for index, segment in enumerate(segments):
            start = float(segment["start_time"])
            end = float(segment["end_time"])
            text = str(segment["text"]).strip()
            if not text:
                continue

            selected = [segment]
            for following in segments[index + 1:index + 4]:
                candidate_end = float(following["end_time"])
                if candidate_end - start > 60:
                    break
                selected.append(following)
                end = candidate_end

            duration = end - start
            if duration < 5:
                continue

            excerpt = " ".join(str(item["text"]).strip() for item in selected)
            lower = excerpt.lower()
            word_count = len(re.findall(r"\b\w+\b", excerpt))
            hook_strength = min(100, 58 + sum(5 for word in hook_words if word in lower))
            completeness = min(100, 60 + min(30, word_count // 4))
            topic_relevance = min(100, 70 + sum(3 for word in signal_words if word in lower))
            engagement_potential = min(100, 62 + (10 if "?" in excerpt else 0) + (8 if "!" in excerpt else 0))
            average = (hook_strength + completeness + topic_relevance + engagement_potential) // 4

            words = [word.strip(".,!?;:") for word in excerpt.split()[:12] if word.strip()]
            title = " ".join(words).strip(" -")
            if len(title) > 70:
                title = title[:67].rsplit(" ", 1)[0] + "..."

            candidates.append({
                "title": title or f"Key moment {index + 1}",
                "start_time": start,
                "end_time": end,
                "duration_seconds": round(duration, 1),
                "transcript_excerpt": excerpt,
                "selection_reason": (
                    f"Scores {average}/100; a standalone transcript segment with "
                    f"{word_count} words, clear boundaries, and content/engagement signals."
                ),
                "hook_strength": hook_strength,
                "completeness": completeness,
                "topic_relevance": topic_relevance,
                "engagement_potential": engagement_potential,
                "recommended_platforms": ["instagram", "youtube", "linkedin"],
                "thumbnail_color": "#1a2a4a",
            })

        return sorted(candidates, key=lambda item: item["engagement_potential"], reverse=True)[:8]


clip_intelligence_service = ClipIntelligenceService()
