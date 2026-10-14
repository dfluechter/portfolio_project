from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard-Paginierungsklasse für DRF ViewSets.
    Ermöglicht Client-Steuerung via ?page= und ?page_size= (Default: 20, Max: 100).
    Über ?no_page=true oder ?all=true kann die Paginierung für Full-List-Abrufe
    (z. B. HeroSearch oder Dropdowns) deaktiviert werden.
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        params = request.query_params
        if params.get("no_page", "").lower() in ("true", "1", "all") or params.get(
            "all", ""
        ).lower() in ("true", "1"):
            return None
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "total_pages": self.page.paginator.num_pages,
                "current_page": self.page.number,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )
