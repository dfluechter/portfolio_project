from typing import Any

from django.core.management.base import BaseCommand, CommandParser

from portfolio.services.chunking import reindex_all_portfolio_chunks


class Command(BaseCommand):
    help = "Indiziert alle publizierten Portfolio-Objekte in RAG KnowledgeChunks."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--with-embeddings",
            action="store_true",
            help="Erzeugt zusätzlich Vektoreinbettungen via Gemini.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        with_embeddings = bool(options.get("with_embeddings", False))
        emb_label = "Ja" if with_embeddings else "Nein"
        self.stdout.write(f"Starte RAG-Chunk-Indizierung (Embeddings: {emb_label})...")
        count = reindex_all_portfolio_chunks(generate_embeddings=with_embeddings)
        self.stdout.write(
            self.style.SUCCESS(f"Erfolgreich {count} KnowledgeChunk(s) indiziert.")
        )
