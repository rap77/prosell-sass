"""Fueleconomy.gov API client for MPG and emissions data.

Complements NHTSA VIN decode with fuel consumption data.
Free API, no key required.
Docs: https://www.fueleconomy.gov/feg/ws/index.shtml
"""

import httpx

BASE_URL = "https://www.fueleconomy.gov/ws/rest"


async def get_vehicle_options(year: int, make: str, model: str) -> list[dict]:
    """Get vehicle options (trims) for year/make/model.

    Returns list of {id, text} where id is the fueleconomy vehicle ID.
    """
    url = f"{BASE_URL}/vehicle/menu/options"
    params = {"year": year, "make": make, "model": model}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, params=params, headers={"Accept": "application/json"})
        resp.raise_for_status()
        data = resp.json()
        # Response: {"menuItem": [{"value": "12345", "text": "2.0L 4-cyl Auto"}]}
        items = data.get("menuItem", [])
        if isinstance(items, dict):
            items = [items]
        return [{"id": i["value"], "text": i["text"]} for i in items]


async def get_vehicle_by_id(vehicle_id: str) -> dict | None:
    """Get full vehicle specs by fueleconomy ID.

    Returns MPG, emissions, engine specs.
    """
    url = f"{BASE_URL}/vehicle/{vehicle_id}"
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers={"Accept": "application/json"})
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()


async def get_mpg_data(year: int, make: str, model: str) -> dict | None:
    """Get MPG data for a vehicle.

    Tries first option if multiple trims exist.
    Returns: {city_mpg, highway_mpg, combined_mpg, annual_fuel_cost, co2_tailpipe}
    """
    options = await get_vehicle_options(year, make, model)
    if not options:
        return None

    # ponytail: take first option, good enough for estimates
    vehicle = await get_vehicle_by_id(options[0]["id"])
    if not vehicle:
        return None

    return {
        "city_mpg": vehicle.get("city08"),
        "highway_mpg": vehicle.get("highway08"),
        "combined_mpg": vehicle.get("comb08"),
        "annual_fuel_cost": vehicle.get("fuelCost08"),
        "co2_tailpipe": vehicle.get("co2TailpipeGpm"),
        "fuel_type": vehicle.get("fuelType"),
        "trim_options": [o["text"] for o in options],  # for UI selection
    }
