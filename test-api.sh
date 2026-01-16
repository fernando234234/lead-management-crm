#!/bin/bash
BASE="http://localhost:3006"

echo "=========================================="
echo "TESTING ALL API ENDPOINTS"
echo "=========================================="

# Get a marketer ID for creating campaigns
echo -e "\n--- Getting Users (for IDs) ---"
USERS=$(curl -s "$BASE/api/users")
MARKETER_ID=$(echo $USERS | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Using Marketer ID: $MARKETER_ID"

# Get a course ID
echo -e "\n--- Getting Courses (for IDs) ---"
COURSES=$(curl -s "$BASE/api/courses")
COURSE_ID=$(echo $COURSES | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Using Course ID: $COURSE_ID"

echo -e "\n=========================================="
echo "1. CAMPAIGNS API"
echo "=========================================="

# CREATE Campaign
echo -e "\n--- POST /api/campaigns (CREATE) ---"
NEW_CAMPAIGN=$(curl -s -X POST "$BASE/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Campaign API\",
    \"platform\": \"FACEBOOK\",
    \"courseId\": \"$COURSE_ID\",
    \"createdById\": \"$MARKETER_ID\",
    \"budget\": 1000,
    \"status\": \"DRAFT\"
  }")
echo $NEW_CAMPAIGN | head -c 500
CAMPAIGN_ID=$(echo $NEW_CAMPAIGN | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "\nCreated Campaign ID: $CAMPAIGN_ID"

# READ Single Campaign
echo -e "\n--- GET /api/campaigns/$CAMPAIGN_ID (READ) ---"
curl -s "$BASE/api/campaigns/$CAMPAIGN_ID" | head -c 500

# UPDATE Campaign
echo -e "\n\n--- PUT /api/campaigns/$CAMPAIGN_ID (UPDATE) ---"
curl -s -X PUT "$BASE/api/campaigns/$CAMPAIGN_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Campaign UPDATED\",
    \"status\": \"ACTIVE\",
    \"budget\": 2000
  }" | head -c 500

# DELETE Campaign
echo -e "\n\n--- DELETE /api/campaigns/$CAMPAIGN_ID ---"
curl -s -X DELETE "$BASE/api/campaigns/$CAMPAIGN_ID"

echo -e "\n\n=========================================="
echo "2. CAMPAIGN SPEND API"
echo "=========================================="

# First create a campaign to add spend to
NEW_CAMPAIGN2=$(curl -s -X POST "$BASE/api/campaigns" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Campaign for Spend Test\",
    \"platform\": \"GOOGLE_ADS\",
    \"courseId\": \"$COURSE_ID\",
    \"createdById\": \"$MARKETER_ID\",
    \"budget\": 5000,
    \"status\": \"ACTIVE\"
  }")
CAMPAIGN_ID2=$(echo $NEW_CAMPAIGN2 | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Campaign for Spend: $CAMPAIGN_ID2"

# CREATE Spend Record
echo -e "\n--- POST /api/campaigns/$CAMPAIGN_ID2/spend (CREATE) ---"
NEW_SPEND=$(curl -s -X POST "$BASE/api/campaigns/$CAMPAIGN_ID2/spend" \
  -H "Content-Type: application/json" \
  -d "{
    \"date\": \"2026-01-15\",
    \"amount\": 150.50,
    \"notes\": \"Test spend record\"
  }")
echo $NEW_SPEND
SPEND_ID=$(echo $NEW_SPEND | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Created Spend ID: $SPEND_ID"

# READ Spend Records
echo -e "\n--- GET /api/campaigns/$CAMPAIGN_ID2/spend (READ) ---"
curl -s "$BASE/api/campaigns/$CAMPAIGN_ID2/spend"

# DELETE Spend (cleanup)
echo -e "\n\n--- DELETE /api/campaigns/$CAMPAIGN_ID2/spend?spendId=$SPEND_ID ---"
curl -s -X DELETE "$BASE/api/campaigns/$CAMPAIGN_ID2/spend?spendId=$SPEND_ID"

# Cleanup campaign
curl -s -X DELETE "$BASE/api/campaigns/$CAMPAIGN_ID2" > /dev/null

echo -e "\n\n=========================================="
echo "3. LEADS API"
echo "=========================================="

# Get an existing campaign for lead
EXISTING_CAMPAIGN=$(curl -s "$BASE/api/campaigns" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Using Campaign: $EXISTING_CAMPAIGN"

# CREATE Lead
echo -e "\n--- POST /api/leads (CREATE) ---"
NEW_LEAD=$(curl -s -X POST "$BASE/api/leads" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Lead API\",
    \"email\": \"testlead@example.com\",
    \"phone\": \"+39 333 1234567\",
    \"courseId\": \"$COURSE_ID\",
    \"campaignId\": \"$EXISTING_CAMPAIGN\",
    \"assignedToId\": \"$MARKETER_ID\",
    \"status\": \"NUOVO\"
  }")
echo $NEW_LEAD | head -c 500
LEAD_ID=$(echo $NEW_LEAD | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "\nCreated Lead ID: $LEAD_ID"

# READ Single Lead
echo -e "\n--- GET /api/leads/$LEAD_ID (READ) ---"
curl -s "$BASE/api/leads/$LEAD_ID" | head -c 500

# UPDATE Lead
echo -e "\n\n--- PUT /api/leads/$LEAD_ID (UPDATE) ---"
curl -s -X PUT "$BASE/api/leads/$LEAD_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"status\": \"CONTATTATO\",
    \"notes\": \"Updated via API test\"
  }" | head -c 500

# DELETE Lead
echo -e "\n\n--- DELETE /api/leads/$LEAD_ID ---"
curl -s -X DELETE "$BASE/api/leads/$LEAD_ID"

echo -e "\n\n=========================================="
echo "4. COURSES API"
echo "=========================================="

# CREATE Course
echo -e "\n--- POST /api/courses (CREATE) ---"
NEW_COURSE=$(curl -s -X POST "$BASE/api/courses" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Course API\",
    \"description\": \"A test course created via API\",
    \"price\": 999,
    \"duration\": \"40 ore\",
    \"category\": \"Testing\",
    \"active\": true
  }")
echo $NEW_COURSE | head -c 500
TEST_COURSE_ID=$(echo $NEW_COURSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "\nCreated Course ID: $TEST_COURSE_ID"

# READ Single Course
echo -e "\n--- GET /api/courses/$TEST_COURSE_ID (READ) ---"
curl -s "$BASE/api/courses/$TEST_COURSE_ID" | head -c 500

# UPDATE Course
echo -e "\n\n--- PUT /api/courses/$TEST_COURSE_ID (UPDATE) ---"
curl -s -X PUT "$BASE/api/courses/$TEST_COURSE_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Course UPDATED\",
    \"price\": 1299
  }" | head -c 500

# DELETE Course
echo -e "\n\n--- DELETE /api/courses/$TEST_COURSE_ID ---"
curl -s -X DELETE "$BASE/api/courses/$TEST_COURSE_ID"

echo -e "\n\n=========================================="
echo "5. USERS API"
echo "=========================================="

# CREATE User
echo -e "\n--- POST /api/users (CREATE) ---"
NEW_USER=$(curl -s -X POST "$BASE/api/users" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User API\",
    \"email\": \"testuser_api@example.com\",
    \"password\": \"testpass123\",
    \"role\": \"COMMERCIAL\"
  }")
echo $NEW_USER | head -c 500
TEST_USER_ID=$(echo $NEW_USER | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo -e "\nCreated User ID: $TEST_USER_ID"

# READ Single User
echo -e "\n--- GET /api/users/$TEST_USER_ID (READ) ---"
curl -s "$BASE/api/users/$TEST_USER_ID" | head -c 500

# UPDATE User
echo -e "\n\n--- PUT /api/users/$TEST_USER_ID (UPDATE) ---"
curl -s -X PUT "$BASE/api/users/$TEST_USER_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test User UPDATED\",
    \"role\": \"MARKETING\"
  }" | head -c 500

# DELETE User
echo -e "\n\n--- DELETE /api/users/$TEST_USER_ID ---"
curl -s -X DELETE "$BASE/api/users/$TEST_USER_ID"

echo -e "\n\n=========================================="
echo "6. STATS API"
echo "=========================================="
echo -e "\n--- GET /api/stats (READ) ---"
curl -s "$BASE/api/stats" | head -c 800

echo -e "\n\n=========================================="
echo "ALL TESTS COMPLETED"
echo "=========================================="
