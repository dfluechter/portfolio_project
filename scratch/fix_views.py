with open("portfolio/tests/test_views.py", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("response.url", 'response["Location"]')

with open("portfolio/tests/test_views.py", "w", encoding="utf-8") as f:
    f.write(content)
