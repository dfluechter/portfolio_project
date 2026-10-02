with open('portfolio/tests/test_models.py') as f:
    for i, line in enumerate(f):
        if 150 <= i+1 <= 180:
            print(f"{i+1}: {line.strip()}")
