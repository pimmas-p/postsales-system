# Marketing Team API Integration Guide

## Overview

The Marketing Team can retrieve closed defect cases through a REST API endpoint. This replaces the previous Kafka event-based integration (deprecated).

## Why REST API Instead of Kafka?

- **Pull Model**: Marketing can fetch data on their schedule
- **Simpler Integration**: No need for Kafka consumer setup
- **Flexible Queries**: Filter by date range with pagination
- **Better for Periodic Access**: Marketing doesn't need real-time events

## API Endpoint

### GET /api/defects/closed-cases

Retrieve closed defect cases within a date range.

**Base URL**: `http://localhost:3001` (development) or your production URL

**Endpoint**: `/api/defects/closed-cases`

**Method**: GET

**Authentication**: TBD (Add your authentication mechanism)

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `from` | string (date) | No | - | Start date in YYYY-MM-DD format |
| `to` | string (date) | No | - | End date in YYYY-MM-DD format |
| `limit` | integer | No | 100 | Maximum records to return (1-1000) |
| `offset` | integer | No | 0 | Number of records to skip for pagination |

### Request Examples

#### Get all closed cases from last month
```bash
curl "http://localhost:3001/api/defects/closed-cases?from=2024-01-01&to=2024-01-31"
```

#### Get closed cases with pagination
```bash
curl "http://localhost:3001/api/defects/closed-cases?from=2024-01-01&to=2024-12-31&limit=50&offset=0"
```

#### Get all closed cases (no date filter)
```bash
curl "http://localhost:3001/api/defects/closed-cases?limit=100"
```

### Response Format

**Success Response (200 OK)**:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "defect_number": "DEF-2024-0001",
      "unit_id": "A-101",
      "title": "Broken door handle",
      "category": "door_window",
      "priority": "medium",
      "closed_at": "2024-01-15T10:30:00.000Z",
      "closed_by": "John Doe",
      "closing_notes": "Replaced door handle, tested functionality",
      "photo_after_url": "https://storage.example.com/photos/after/12345.jpg",
      "warranty_id": "c06165a8-ab2d-4d6a-8049-02666ab88bad",
      "warranty_coverage_status": "covered",
      "warranty_coverage_reason": "Within coverage period and scope",
      "warranty_verified_at": "2024-01-15T09:00:00.000Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "defect_number": "DEF-2024-0002",
      "unit_id": "B-205",
      "title": "Leaking faucet",
      "category": "plumbing",
      "priority": "high",
      "closed_at": "2024-01-16T14:20:00.000Z",
      "closed_by": "Jane Smith",
      "closing_notes": "Replaced washer and O-ring",
      "photo_after_url": null,
      "warranty_id": null,
      "warranty_coverage_status": null,
      "warranty_coverage_reason": null,
      "warranty_verified_at": null
    }
  ],
  "total": 156,
  "count": 2,
  "limit": 100,
  "offset": 0
}
```

**Error Response (400 Bad Request)**:

```json
{
  "success": false,
  "error": "Invalid from date format. Use YYYY-MM-DD"
}
```

**Error Response (500 Internal Server Error)**:

```json
{
  "success": false,
  "error": "Database connection error"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique defect case ID |
| `defect_number` | string | Human-readable defect number (e.g., DEF-2024-0001) |
| `unit_id` | string | Property unit identifier |
| `title` | string | Brief defect title |
| `category` | string | Defect category: `electrical`, `plumbing`, `cosmetic`, `structural`, `hvac`, `door_window`, `other` |
| `priority` | string | Priority level: `low`, `medium`, `high`, `critical` |
| `closed_at` | string (ISO 8601) | Timestamp when defect was closed |
| `closed_by` | string | Name of person who closed the defect |
| `closing_notes` | string or null | Notes about case closure |
| `photo_after_url` | string or null | URL of photo after repair completion |
| `warranty_id` | string or null | Warranty ID from Legal Team |
| `warranty_coverage_status` | string or null | Coverage status: `covered`, `rejected`, or `null` (pending verification) |
| `warranty_coverage_reason` | string or null | Reason for coverage decision from Legal Team |
| `warranty_verified_at` | string (ISO 8601) or null | Timestamp when warranty was verified by Legal Team |

### Warranty Information

Each closed defect includes warranty verification data from the Legal Team:

- **warranty_coverage_status**: 
  - `"covered"` - Defect is covered by warranty (Legal Team will handle repairs)
  - `"rejected"` - Defect is not covered by warranty (customer responsibility)
  - `null` - Warranty verification pending (Legal Team has not responded yet)

- **warranty_coverage_reason**: Explanation from Legal Team for their coverage decision (e.g., "Within coverage period and scope" or "Damage caused by user misuse")

- **warranty_verified_at**: Timestamp when Legal Team verified the warranty coverage

**Note**: Warranty verification is a 2-way Kafka communication process:
1. Post-Sales Service publishes `warranty.defect.reported` event when a defect is reported
2. Legal Team responds with `warranty.coverage.verified` event containing coverage decision
3. Marketing API includes this verified warranty data in closed cases response

## Usage Patterns

### Daily Batch Processing

Fetch yesterday's closed cases:

```javascript
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const dateStr = yesterday.toISOString().split('T')[0];

const response = await fetch(
  `http://localhost:3001/api/defects/closed-cases?from=${dateStr}&to=${dateStr}`
);
const data = await response.json();

console.log(`Processed ${data.count} closed cases from ${dateStr}`);
```

### Monthly Report

Fetch all closed cases for a specific month:

```javascript
const response = await fetch(
  'http://localhost:3001/api/defects/closed-cases?from=2024-01-01&to=2024-01-31&limit=1000'
);
const data = await response.json();

// Process data for monthly report
const byCategory = data.data.reduce((acc, defect) => {
  acc[defect.category] = (acc[defect.category] || 0) + 1;
  return acc;
}, {});

console.log('Closed defects by category:', byCategory);
```

### Pagination Example

Handle large datasets with pagination:

```javascript
async function getAllClosedCases(from, to) {
  const allCases = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `http://localhost:3001/api/defects/closed-cases?from=${from}&to=${to}&limit=${limit}&offset=${offset}`
    );
    const data = await response.json();
    
    allCases.push(...data.data);
    
    hasMore = data.count === limit;
    offset += limit;
  }

  return allCases;
}
```

### Warranty Analytics Example

Analyze warranty coverage patterns for marketing insights:

```javascript
const response = await fetch(
  'http://localhost:3001/api/defects/closed-cases?from=2024-01-01&to=2024-12-31&limit=1000'
);
const data = await response.json();

// Group by warranty coverage status
const warrantyStats = data.data.reduce((acc, defect) => {
  const status = defect.warranty_coverage_status || 'pending';
  acc[status] = (acc[status] || 0) + 1;
  return acc;
}, {});

console.log('Warranty Coverage Statistics:', warrantyStats);
// Output: { covered: 85, rejected: 12, pending: 3 }

// Find defects covered by warranty
const warrantyCoveredDefects = data.data.filter(
  defect => defect.warranty_coverage_status === 'covered'
);

console.log(`${warrantyCoveredDefects.length} defects were covered by warranty`);

// Analyze warranty reasons
const rejectionReasons = data.data
  .filter(d => d.warranty_coverage_status === 'rejected')
  .map(d => d.warranty_coverage_reason);

console.log('Warranty rejection reasons:', rejectionReasons);
```

## Integration Checklist

- [ ] Update your Marketing application base URL to point to Post-Sales API
- [ ] Implement authentication (if required)
- [ ] Set up scheduled job to fetch closed cases (daily/weekly)
- [ ] Handle pagination for large datasets
- [ ] Implement error handling and retry logic
- [ ] Store retrieved data in your Marketing database
- [ ] Remove old Kafka consumer code (if migrating from Kafka)
- [ ] Update your analytics dashboards to use new data source
- [ ] Test with sample data in development environment
- [ ] Monitor API usage and performance in production

## Support

For questions or issues with the API:
- Contact: Post-Sales Backend Team
- API Documentation: `/api-docs` (Swagger UI)
- GitHub Issues: [Project Repository]

## Changelog

### v1.0 (2024-01-15)
- Initial REST API implementation
- Replaced deprecated Kafka event `postsales.caseclosed.completed`
- Added date range filtering and pagination
