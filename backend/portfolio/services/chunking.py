import datetime
import logging
from typing import Any

from portfolio.models import (
    Certificate,
    KnowledgeChunk,
    Project,
    Skill,
    TimelineEntry,
)

from .embeddings import generate_embedding

logger = logging.getLogger(__name__)

MAX_CHUNK_TEXT_CHARS = 1200


def _format_date(value: Any, fmt: str) -> str:
    """Formatiert ein Datum sicher (unterstützt date, datetime sowie ISO-Strings)."""
    if not value:
        return ""
    if hasattr(value, "strftime"):
        return str(value.strftime(fmt))
    if isinstance(value, str):
        try:
            parsed = datetime.date.fromisoformat(value[:10])
            return parsed.strftime(fmt)
        except ValueError:
            return value
    return str(value)


def build_chunks_for_project(project: Project) -> list[dict[str, Any]]:
    """Erzeugt semantische Wissens-Chunks für ein Portfolio-Projekt."""
    if not project.is_published:
        return []

    skills_list = [s.name for s in project.skills.all()] if project.pk else []
    skills_str = (
        ", ".join(skills_list) if skills_list else "Keine spezifischen Skills verknüpft"
    )

    live_url = getattr(project, "live_url", None) or getattr(project, "demo_url", None)
    demo_info = f"Live-Demo: {live_url}" if live_url else ""
    github_info = f"GitHub: {project.github_url}" if project.github_url else ""
    links_str = " | ".join(filter(None, [demo_info, github_info]))

    content_parts = [
        f"Projekt: {project.title}",
        f"Detailbeschreibung: {project.description}",
        f"Eingesetzte Technologien & Skills: {skills_str}",
    ]
    if links_str:
        content_parts.append(f"Referenzen: {links_str}")

    full_text = "\n".join(content_parts)

    return [
        {
            "source_type": KnowledgeChunk.SOURCE_PROJECT,
            "source_id": project.id,
            "chunk_index": 0,
            "title": project.title,
            "content": full_text,
            "metadata": {
                "target_id": f"project-{project.id}",
                "is_featured": project.is_featured,
                "skills": skills_list,
                "live_url": live_url or "",
                "github_url": project.github_url or "",
            },
        }
    ]


def build_chunks_for_certificate(cert: Certificate) -> list[dict[str, Any]]:
    """Erzeugt semantische Wissens-Chunks für ein verifiziertes Zertifikat."""
    if not cert.is_published:
        return []

    provider_name = (
        cert.provider.provider
        if getattr(cert, "provider_id", None) and cert.provider
        else "Unbekannter Aussteller"
    )
    tracks_list = [t.name for t in cert.tracks.all()] if cert.pk else []
    tracks_str = ", ".join(tracks_list) if tracks_list else "Allgemein"

    date_str = _format_date(
        cert.issued_date or getattr(cert, "uploaded_at", None), "%d.%m.%Y"
    )
    cred_id = cert.credential_id or "Keine ID"

    base_header = (
        f"Zertifikat & Qualifikation: {cert.title}\n"
        f"Aussteller: {provider_name} | Ausgestellt am: {date_str}\n"
        f"Credential-ID: {cred_id} | Tracks: {tracks_str}"
    )

    chunks: list[dict[str, Any]] = [
        {
            "source_type": KnowledgeChunk.SOURCE_CERTIFICATE,
            "source_id": cert.id,
            "chunk_index": 0,
            "title": cert.title,
            "content": base_header,
            "metadata": {
                "target_id": f"cert-{cert.id}",
                "provider": provider_name,
                "credential_id": cert.credential_id or "",
                "credential_url": cert.credential_url or "",
                "tracks": tracks_list,
            },
        }
    ]

    # OCR-Text direkt vom Attribut oder aus verknüpftem PendingCertificate beziehen
    extracted = getattr(cert, "extracted_text", None)
    if not extracted:
        pending = getattr(cert, "source_pending", None)
        if pending:
            extracted = getattr(pending, "extracted_text", None)

    extracted_str = (extracted or "").strip()
    if extracted_str:
        cleaned_ocr = " ".join(extracted_str.split())
        if len(cleaned_ocr) > 100:
            words = cleaned_ocr.split()
            current_words: list[str] = []
            current_len = 0
            sub_index = 1

            for w in words:
                current_words.append(w)
                current_len += len(w) + 1
                if current_len >= MAX_CHUNK_TEXT_CHARS:
                    sub_text = " ".join(current_words)
                    part_title = f"{cert.title} (Inhalt / Transkript Teil {sub_index})"
                    chunks.append(
                        {
                            "source_type": KnowledgeChunk.SOURCE_CERTIFICATE,
                            "source_id": cert.id,
                            "chunk_index": sub_index,
                            "title": part_title,
                            "content": (
                                f"Zertifikatsinhalt ({cert.title}):\n{sub_text}"
                            ),
                            "metadata": {
                                "target_id": f"cert-{cert.id}",
                                "provider": provider_name,
                                "is_ocr_extract": True,
                            },
                        }
                    )
                    sub_index += 1
                    current_words = []
                    current_len = 0

            if current_words:
                sub_text = " ".join(current_words)
                part_title = f"{cert.title} (Inhalt / Transkript Teil {sub_index})"
                chunks.append(
                    {
                        "source_type": KnowledgeChunk.SOURCE_CERTIFICATE,
                        "source_id": cert.id,
                        "chunk_index": sub_index,
                        "title": part_title,
                        "content": (f"Zertifikatsinhalt ({cert.title}):\n{sub_text}"),
                        "metadata": {
                            "target_id": f"cert-{cert.id}",
                            "provider": provider_name,
                            "is_ocr_extract": True,
                        },
                    }
                )

    return chunks


def build_chunks_for_skill(skill: Skill) -> list[dict[str, Any]]:
    """Erzeugt einen Wissens-Chunk für einen Skill."""
    featured_str = " (Hervorgehobener Kern-Skill)" if skill.is_featured else ""
    content = (
        f"Skill / Fähigkeit: {skill.name}\n"
        f"Kategorie: {skill.get_category_display()}\n"
        f"Kenntnisstand: {skill.proficiency}%{featured_str}"
    )
    return [
        {
            "source_type": KnowledgeChunk.SOURCE_SKILL,
            "source_id": skill.id,
            "chunk_index": 0,
            "title": skill.name,
            "content": content,
            "metadata": {
                "category": skill.category,
                "proficiency": skill.proficiency,
                "is_featured": skill.is_featured,
            },
        }
    ]


def build_chunks_for_timeline(entry: TimelineEntry) -> list[dict[str, Any]]:
    """Erzeugt einen Wissens-Chunk für eine Timeline-Station."""
    start = _format_date(entry.start_date, "%m/%Y")
    end = "Aktuell" if entry.is_current else _format_date(entry.end_date, "%m/%Y")
    period = f"{start} - {end}".strip(" -")
    content = (
        f"Beruflicher Werdegang: {entry.title} bei {entry.organization}\n"
        f"Zeitraum: {period} | Ort: {entry.location}\n"
        f"Aufgaben & Meilensteine: {entry.description}"
    )
    return [
        {
            "source_type": KnowledgeChunk.SOURCE_TIMELINE,
            "source_id": entry.id,
            "chunk_index": 0,
            "title": f"{entry.title} - {entry.organization}",
            "content": content,
            "metadata": {
                "organization": entry.organization,
                "location": entry.location,
                "is_current": entry.is_current,
            },
        }
    ]


def sync_chunks_for_instance(instance: Any, generate_embeddings: bool = True) -> int:
    """Synchronisiert alle Chunks für eine gegebene Model-Instanz."""
    chunk_data_list: list[dict[str, Any]] = []
    source_type = ""
    source_id = getattr(instance, "id", None)

    if not source_id:
        return 0

    if isinstance(instance, Project):
        source_type = KnowledgeChunk.SOURCE_PROJECT
        chunk_data_list = build_chunks_for_project(instance)
    elif isinstance(instance, Certificate):
        source_type = KnowledgeChunk.SOURCE_CERTIFICATE
        chunk_data_list = build_chunks_for_certificate(instance)
    elif isinstance(instance, Skill):
        source_type = KnowledgeChunk.SOURCE_SKILL
        chunk_data_list = build_chunks_for_skill(instance)
    elif isinstance(instance, TimelineEntry):
        source_type = KnowledgeChunk.SOURCE_TIMELINE
        chunk_data_list = build_chunks_for_timeline(instance)
    else:
        return 0

    # Alte Chunks für diese Instanz entfernen
    KnowledgeChunk.objects.filter(source_type=source_type, source_id=source_id).delete()

    created_count = 0
    for data in chunk_data_list:
        embedding_val = None
        if generate_embeddings:
            embedding_val = generate_embedding(data["content"])

        KnowledgeChunk.objects.create(
            source_type=data["source_type"],
            source_id=data["source_id"],
            chunk_index=data["chunk_index"],
            title=data["title"],
            content=data["content"],
            metadata=data.get("metadata", {}),
            embedding=embedding_val,
        )
        created_count += 1

    return created_count


def delete_chunks_for_instance(source_type: str, source_id: int) -> int:
    """Löscht alle Chunks einer Entität."""
    deleted, _ = KnowledgeChunk.objects.filter(
        source_type=source_type, source_id=source_id
    ).delete()
    return deleted


def reindex_all_portfolio_chunks(generate_embeddings: bool = False) -> int:
    """Reindiziert alle publizierten Portfolio-Daten in KnowledgeChunk-Datensätze."""
    total = 0
    for p in Project.objects.filter(is_published=True):
        total += sync_chunks_for_instance(p, generate_embeddings=generate_embeddings)
    for c in Certificate.objects.filter(is_published=True):
        total += sync_chunks_for_instance(c, generate_embeddings=generate_embeddings)
    for s in Skill.objects.all():
        total += sync_chunks_for_instance(s, generate_embeddings=generate_embeddings)
    for t in TimelineEntry.objects.all():
        total += sync_chunks_for_instance(t, generate_embeddings=generate_embeddings)
    return total
