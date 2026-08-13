#!/usr/bin/env python3
"""
Script para enviar productos a revisión (draft -> pending)
Usa la API de ProSell staging en localhost:8000
"""

import sys

import requests

API_BASE = "http://localhost:8000"
API_V1 = f"{API_BASE}/api/v1"


def login(email: str, password: str) -> requests.Session | None:
    """Login y retorna session con cookies de autenticación"""
    session = requests.Session()

    response = session.post(
        f"{API_V1}/auth/login",
        json={"email": email, "password": password},
    )

    if response.status_code == 200:
        print(f"✅ Login exitoso como {email}")
        return session
    else:
        print(f"❌ Login falló: {response.status_code}")
        print(response.text)
        return None


def list_products(session: requests.Session, status: str | None = None):
    """Lista productos (opcionalmente filtra por status)"""
    params = {"limit": 100}
    if status:
        params["status"] = status

    response = session.get(f"{API_V1}/products", params=params)

    if response.status_code == 200:
        data = response.json()
        products = data.get("items", [])
        print(f"\n📦 Productos encontrados: {len(products)}")

        for p in products:
            print(f"  - {p['id'][:8]}... | {p['title'][:40]} | Status: {p['status']}")

        return products
    else:
        print(f"❌ Error listando productos: {response.status_code}")
        return []


def submit_product_for_review(session: requests.Session, product_id: str) -> bool:
    """Envía un producto a revisión (draft -> pending)"""
    response = session.post(f"{API_V1}/products/{product_id}/submit")

    if response.status_code == 200:
        print(f"✅ Producto {product_id[:8]}... enviado a revisión")
        return True
    else:
        print(f"❌ Error enviando producto {product_id[:8]}...: {response.status_code}")
        print(f"   {response.text}")
        return False


def main():
    print("🚀 ProSell - Enviar Productos a Revisión\n")

    # Credenciales (cambialas según tu admin)
    email = input("Email (default: admin@prosellweb.com): ").strip() or "admin@prosellweb.com"
    password = input("Password: ").strip()

    if not password:
        print("❌ Password requerido")
        sys.exit(1)

    # Login
    session = login(email, password)
    if not session:
        sys.exit(1)

    # Listar productos draft
    print("\n🔍 Buscando productos en estado 'draft'...")
    draft_products = list_products(session, status="draft")

    if not draft_products:
        print("\n⚠️  No hay productos en estado 'draft' para enviar a revisión")
        print("\n💡 Tip: Podés crear productos desde la UI o buscar otros status:")
        list_products(session)
        sys.exit(0)

    # Preguntar si enviar todos o elegir
    print(f"\n¿Querés enviar TODOS los {len(draft_products)} productos a revisión? (y/n): ", end="")
    send_all = input().strip().lower()

    if send_all == "y":
        print(f"\n📤 Enviando {len(draft_products)} productos a revisión...\n")
        success_count = 0

        for product in draft_products:
            if submit_product_for_review(session, product["id"]):
                success_count += 1

        print(
            f"\n✅ {success_count}/{len(draft_products)} productos enviados a revisión exitosamente"
        )
        print("\n🔗 Ahora podés ir a: http://localhost:3000/admin/review-queue")
    else:
        print("\n💡 Tip: Podés modificar el script para enviar productos específicos por ID")


if __name__ == "__main__":
    main()
