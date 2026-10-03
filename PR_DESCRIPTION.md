# GET /api/mosques Response

`GET /api/mosques` returns a standard Laravel paginated resource response. Search and filters are optional; coordinates are not required unless `sort=distance` is requested.

```json
{
  "data": [
    {
      "id": 42,
      "name": "Gulshan Community Mosque",
      "address": "Road 63, Gulshan 2, Dhaka 1212, Bangladesh",
      "district": "Dhaka",
      "area": "Gulshan",
      "photo_url": "https://mosqueconnect.example/api/mosques/42/photo?v=1a2b3c4d",
      "rating": 4.6,
      "reviews_count": 18,
      "has_admin": true,
      "latitude": 23.7925,
      "longitude": 90.4078,
      "phone": "+880 2-9880000",
      "description": "A community mosque in Gulshan.",
      "verification_status": "verified",
      "facilities": ["women_area", "wudu"],
      "prayer": {"Fajr": "04:50", "Dhuhr": "13:10"},
      "prayer_sources": {"Fajr": "mosque", "Dhuhr": "mosque"},
      "created_at": "2026-10-03T00:00:00.000000Z",
      "updated_at": "2026-10-03T00:00:00.000000Z",
      "distance_km": 1.234
    }
  ],
  "links": {
    "first": "https://mosqueconnect.example/api/mosques?page=1",
    "last": "https://mosqueconnect.example/api/mosques?page=4",
    "prev": null,
    "next": "https://mosqueconnect.example/api/mosques?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "last_page": 4,
    "links": [
      {"url": null, "label": "&laquo; Previous", "active": false},
      {"url": "https://mosqueconnect.example/api/mosques?page=1", "label": "1", "active": true},
      {"url": "https://mosqueconnect.example/api/mosques?page=2", "label": "2", "active": false},
      {"url": "https://mosqueconnect.example/api/mosques?page=3", "label": "3", "active": false},
      {"url": "https://mosqueconnect.example/api/mosques?page=4", "label": "4", "active": false},
      {"url": "https://mosqueconnect.example/api/mosques?page=2", "label": "Next &raquo;", "active": false}
    ],
    "path": "https://mosqueconnect.example/api/mosques",
    "per_page": 12,
    "to": 12,
    "total": 42
  }
}
```

`distance_km` is included when `lat` and `lng` are supplied. `photo_url` is `null` when a mosque has no uploaded photo.