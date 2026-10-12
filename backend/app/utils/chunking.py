"""Token-based text chunking and token counting (tiktoken cl100k_base)."""

from functools import lru_cache

import tiktoken


@lru_cache
def _get_encoding():
    """Load the tokenizer only when document processing actually needs it.

    ``tiktoken`` may need to populate its encoding cache over the network on a
    fresh machine. Doing that at module import made the entire API fail to boot
    before it could serve health checks or report a document-processing error.
    """
    return tiktoken.get_encoding("cl100k_base")


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[str]:
    """Split text into overlapping chunks, sized in tokens (not characters).

    cl100k_base is the tokenizer used by both GPT-4o-mini and the
    text-embedding-3 models, so chunk sizes here line up with what the
    embedding API actually counts against its input limit.
    """
    encoding = _get_encoding()
    tokens = encoding.encode(text)
    if not tokens:
        return []

    chunks = []
    step = chunk_size - chunk_overlap
    for start in range(0, len(tokens), step):
        chunk_tokens = tokens[start:start + chunk_size]
        chunks.append(encoding.decode(chunk_tokens))
        if start + chunk_size >= len(tokens):
            break

    return chunks


def count_tokens(text: str) -> int:
    return len(_get_encoding().encode(text))
