"""ProSell scripts package.

Internal CLI / data-fix scripts that are importable so their core logic
can be unit-tested. Each script exposes a pure async function for the
business logic, plus a `__main__` entry point that handles CLI args,
DB session lifecycle, and printing.
"""
