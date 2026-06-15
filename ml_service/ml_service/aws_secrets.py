"""AWS Secrets Manager loader — no-op in local dev."""


def load_secrets():
    """In production this would load from AWS Secrets Manager. No-op locally."""
    pass
