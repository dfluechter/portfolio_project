from django.core.management.base import BaseCommand
from portfolio.services.chunking import reindex_all_portfolio_chunks


class Command(BaseCommand):
    help = "Indiziert alle publizierten Portfolio-Objekte in semantische RAG KnowledgeChunks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--with-embeddings",
            action="store_true",
            help="Erzeugt zusätzlich sofort Vektoreinbettungen via Gemini text-embedding-004.",
        )

    def handle(self, *args, **options):
        with_embeddings = options.get("with_embeddings", False)
        self.stdout.write(
            f"Starte RAG-Chunk-Indizierung (Embeddings: {'Ja' if with_embeddings else 'Nein'})..."
        )
        count = reindex_all_portfolio_chunks(generate_embeddings=with_embeddings)
        self.stdout.write(
            self.style.SUCCESS(f"Erfolgreich {count} KnowledgeChunk(s) indiziert.")
        )
