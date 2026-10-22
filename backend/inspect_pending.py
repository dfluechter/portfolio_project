import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from collections import Counter
from portfolio.models import Provider, PendingCertificate, Certificate

providers = list(Provider.objects.values('id', 'name', 'slug'))
print(f"--- PROVIDERS IN DB ({len(providers)}) ---")
for p in sorted(providers, key=lambda x: x['name'].lower()):
    print(f"{p['id']}: {p['name']} ({p['slug']})")

pending_total = PendingCertificate.objects.count()
status_counts = Counter(PendingCertificate.objects.values_list('status', flat=True))
print('\n--- PENDING CERTIFICATES SUMMARY ---')
print(f'Total: {pending_total}')
for s, c in status_counts.items():
    print(f'  {s}: {c}')

pending_objs = PendingCertificate.objects.filter(status='pending')
print(f'\n--- DETAILS OF PENDING (Total: {pending_objs.count()}) ---')
pending_providers = Counter(pending_objs.values_list('suggested_provider', flat=True))
print('Top suggested providers:')
for sp, c in pending_providers.most_common(25):
    print(f'  {sp or "[None]"}: {c}')

pending_tracks = Counter(pending_objs.values_list('suggested_track', flat=True))
print('Top suggested tracks:')
for st, c in pending_tracks.most_common(25):
    print(f'  {st or "[None]"}: {c}')

print('\nSample 10 pending certificates:')
for p in pending_objs[:10]:
    print(f"  ID {p.id}: file='{p.file_path}' | title='{p.suggested_title}' | prov='{p.suggested_provider}' | track='{p.suggested_track}' | date={p.suggested_issue_date}")
