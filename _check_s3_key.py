import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from django.conf import settings

secret = settings.AWS_SECRET_ACCESS_KEY or ""
key_id = settings.AWS_ACCESS_KEY_ID or ""

print(f"ACCESS_KEY_ID  Länge : {len(key_id)}")
print(f"ACCESS_KEY_ID  Wert  : {key_id}")
print(f"SECRET_KEY     Länge : {len(secret)}")
print(f"SECRET_KEY     Anfang: [{secret[:10]}]")
print(f"SECRET_KEY     Ende  : [{secret[-10:]}]")
print(f"SECRET enthält Leerzeichen: {' ' in secret}")
print(f"SECRET enthält Newline    : {chr(10) in secret}")
print(f"SECRET enthält Tab        : {chr(9) in secret}")
