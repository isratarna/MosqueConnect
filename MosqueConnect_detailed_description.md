# MosqueConnect — UI Wireframe & Page Specification

> **Project:** MosqueConnect — A Geolocation-Based Mosque & Community Engagement Platform  
> **Purpose of this document:** Convert the project proposal and hand-drawn sketches into a clear page-by-page UI/UX specification that frontend, backend, testing, and DevOps members can follow.

---

## 0. Legend

- **Existing idea:** Taken from the project proposal or the provided hand sketches.
- **(Suggested: ...):** Added to improve usability, completeness, security, or implementation clarity.
- **Role access:** Visitor / Registered User / Mosque Admin / Super Admin.

---

# 1. Main Site Map

```text
Public Website
├── Home
├── Browse Mosques
│   └── Mosque Profile
├── Donations & Community Support
│   ├── Money
│   ├── Blood
│   ├── Volunteer
│   ├── Goods
│   └── Custom Support
├── Community Hub
│   ├── Announcements
│   │   └── Announcement Details
│   ├── Events
│   │   └── Event Details
│   ├── Blood Requests
│   ├── Volunteer Opportunities
│   ├── Lost & Found
│   ├── Complaints / Suggestions
│   └── General Community Notices
├── Ramadan Mode
├── About Us
├── Contact
├── Login
└── Register

Registered User Area
├── User Dashboard
├── Followed Mosques
├── Notifications
├── My Donations / Support Activity
├── My Volunteer Applications
├── My Blood Donor Profile
└── Account Settings

Mosque Admin Area
├── Mosque Admin Dashboard
├── Claim / Register Mosque
├── Manage Mosque Profile
├── Manage Prayer Times
├── Manage Announcements
├── Manage Events
├── Manage Donation Campaigns
├── Manage Goods Requests
├── Manage Volunteer Opportunities
└── View Followers / Reports

Super Admin Area
├── Admin Dashboard
├── Approve Mosque Claims
├── Manage Mosques
├── Manage Users
├── Moderate Community Content
├── Review Complaints / Reports
└── System Statistics
```

**(Suggested: Keep “Donations” in the main navbar, but use the page title “Donations & Community Support” because blood, volunteering, goods, and custom help are not all financial donations.)**

---

# 2. Global Layout and Design Rules

## 2.1 Header / Navbar

### Desktop Layout

```text
[Logo: MosqueConnect]

Home | Browse Mosques | Donations | Community | Ramadan Mode

[Search Icon] [Notifications] [Login] [Register]
or
[Profile Dropdown]
```

### Behaviour

- The current page link remains highlighted.
- Visitors see **Login** and **Register**.
- Logged-in users see **Notification Bell** and **Profile Dropdown**.
- Mosque Admin users see an additional **Admin Dashboard** link.
- Super Admin users see an additional **Super Admin** link.
- **(Suggested: Use a sticky navbar so navigation remains visible while scrolling.)**
- **(Suggested: On mobile, convert the navbar into a hamburger menu.)**

## 2.2 Footer

```text
[Logo + Short Description]

Quick Links
- Home
- Browse Mosques
- Donations
- Community
- Community Events

Support
- Help
- FAQ
- Report an Issue

Legal
- Privacy Policy
- Terms and Conditions

Contact
- Email
- Phone
- Social Links

© MosqueConnect
```

**(Suggested: Add “Verified Mosque Information” and “Emergency disclaimer” links.)**

## 2.3 Common UI Components

- Mosque card
- Filter panel
- Search bar
- Map marker popup
- Facility badge
- Verified badge
- Status badge
- Progress bar
- Pagination
- Modal
- Form validation message
- Toast notification
- Empty-state message
- Loading skeleton
- Confirmation dialog

---

# 3. Home Page

## 3.1 Page Goal

When a user opens the website, the system first asks for location permission. After permission is granted, the home-page map loads using the user’s current location, displays nearby mosques, and automatically shows the nearest mosque’s details beside the map.

The home page will not contain search or filter controls. Search, filtering, sorting, list view, and advanced mosque discovery will remain on the **Browse Mosques** page.

## 3.2 Initial User Flow

```text
User Opens Home Page
        ↓
Browser Requests Location Permission
        ↓
┌───────────────────────────────┐
│ Permission Granted?           │
└───────────────────────────────┘
      ↓ Yes                 ↓ No
Detect Current Location     Show Manual Location Option
      ↓                          ↓
Load Nearby Mosques         Load Mosques for Chosen Area
      ↓                          ↓
Sort by Distance
      ↓
Select Nearest Mosque Automatically
      ↓
Show Nearest Mosque Details Beside Map
```

## 3.3 Location Permission Prompt

```text
Find mosques near you

MosqueConnect uses your location to show nearby mosques,
distance, directions, and the next Jamat time.

[Allow Location] [Choose Location Manually]
```

**(Suggested: First show this short explanation, then trigger the browser location permission after the user clicks “Allow Location.”)**

## 3.4 Home Page Main Wireframe

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ HEADER / NAVBAR                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ HERO SECTION                                                               │
│ “Find nearby mosques and stay connected with your community.”              │
│ [Use My Location] [Browse Mosques]                                         │
├───────────────────────────────────────┬────────────────────────────────────┤
│ INTERACTIVE MAP                       │ SELECTED MOSQUE DETAILS             │
│                                       │                                    │
│ [User Location Marker]                │ Mosque Name [Verified Badge]        │
│                                       │ Address                            │
│ [Nearest Mosque Marker — Selected]    │ Distance                           │
│ [Other Mosque Markers]                │ Next Jamat                         │
│                                       │ Facilities                         │
│ Zoom Controls                         │ Latest Announcement                 │
│ Recenter Button                       │                                    │
│                                       │ [View Profile]                     │
│                                       │ [Get Directions]                   │
│                                       │ [Follow]                           │
├───────────────────────────────────────┴────────────────────────────────────┤
│ SUPPORT THE COMMUNITY                                                      │
│ [Money] [Blood] [Volunteer] [Goods] [Custom Support]                       │
├────────────────────────────────────────────────────────────────────────────┤
│ IMPACT                                                                     │
│ [Verified Mosques] [Users Connected] [Campaigns Completed]                 │
│ [Volunteers Connected] [Blood Requests Fulfilled]                          │
├────────────────────────────────────────────────────────────────────────────┤
│ ABOUT MOSQUECONNECT                                                        │
│ Short platform description and verification message                       │
│ [Learn More About Us]                                                      │
├────────────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                                     │
│ Quick Links | Community | Support | Help & Legal | Contact                 │
└────────────────────────────────────────────────────────────────────────────┘
```

There will be no search bar, filter panel, sorting control, or result-count control on the home page.

## 3.5 Default Map Behaviour

After location permission is granted:

1. Detect the user’s latitude and longitude.
2. Load mosques within the configured nearby radius.
3. Calculate each mosque’s distance from the user.
4. Sort mosques from nearest to farthest in the backend.
5. Automatically select the nearest mosque.
6. Highlight its map marker.
7. Show its details in the panel beside the map.
8. Fit the map so the user and nearby mosque markers are visible.

Initial selected mosque panel:

```text
Nearest Mosque

Mosque Name [Verified]
60 m away

Next Jamat
Maghrib — 6:45 PM

Facilities
[Women’s Area] [Child Care] [Parking] [Wudu]

Latest Update
“Maghrib Jamat time has been updated.”

[View Profile] [Get Directions] [Follow]
```

**(Suggested: Show “Nearest Mosque” only for the initially auto-selected result. After the user selects another marker, change the label to “Selected Mosque.”)**

## 3.6 Selecting Another Mosque from the Map

```text
Click Another Mosque Marker
        ↓
Highlight Selected Marker
        ↓
Remove Highlight from Previous Marker
        ↓
Load Selected Mosque Data
        ↓
Replace Details in Side Panel
        ↓
Keep User on the Same Home Page
```

The page should not reload.

The selected mosque details panel updates with:

- Mosque name
- Verified status
- Address
- Distance from the user
- Next Jamat
- Today’s prayer times
- Facilities
- Latest announcement
- Follow status
- View Profile button
- Get Directions button

**(Suggested: Keep the map-marker popup small—only mosque name, distance, and next Jamat. Show full information in the side panel.)**

## 3.7 Browse Mosques Button

The **Browse Mosques** button sends users to the separate mosque-discovery page.

```text
Home Page
    ↓
[Browse Mosques]
    ↓
Browse Mosques Page
    ↓
Search / Filter / Sort / List / Grid / Map
```

All of the following belong only on the Browse Mosques page:

- Search by mosque name
- District and area filter
- Distance filter
- Facility filters
- Verified-only filter
- Sorting
- List view
- Grid view
- Advanced map search

## 3.8 Location Denied or Unavailable

If location permission is denied or geolocation fails:

```text
We could not access your location.

[Choose Area Manually]
[Try Location Again]
[Browse All Mosques]
```

After the user chooses an area manually:

- Use the chosen area as the map centre.
- Load nearby mosques for that area.
- Automatically select the nearest available mosque.
- Show its details beside the map.

**(Suggested: Do not block the rest of the website when location access is denied.)**

## 3.9 Loading States

While detecting location:

```text
Detecting your location...
```

While loading the map:

```text
Finding nearby mosques...
```

While loading selected mosque details:

```text
Loading mosque information...
```

**(Suggested: Show a map skeleton and details-card skeleton instead of a blank section.)**

## 3.10 Mobile Behaviour

On mobile:

```text
Interactive Map
      ↓
Selected Mosque Bottom Card
```

Bottom card:

```text
Mosque Name [Verified]
Distance | Next Jamat

[View Profile] [Directions]
```

Users can swipe upward to see more details.

There will still be no search or filter controls on the mobile home page.

## 3.11 Home Page Data Requirements

For each map result, the backend should return:

- Mosque ID
- Mosque name
- Latitude
- Longitude
- Distance
- Verified status
- Next Jamat name
- Next Jamat time
- Facility flags
- Latest announcement summary
- Follow status
- Profile thumbnail
- Last updated time

## 3.12 Recommended Home Page API Flow

```text
GET /api/mosques/nearby?lat={lat}&lng={lng}&radius={radius}
```

For selected mosque details:

```text
GET /api/mosques/{id}/summary
```

## 3.13 Home Page Acceptance Criteria

- Location permission is requested through a clear user action.
- The map loads after location is available.
- Nearby mosques appear as markers.
- The nearest mosque is selected automatically.
- The nearest mosque’s details appear beside the map.
- Clicking another marker updates the side panel without reloading.
- No search or filter controls appear on the home page.
- Browse Mosques opens the full search and filtering page.
- Manual area selection works when geolocation is denied.
- Desktop and mobile layouts remain usable.

---

# 3A. Support the Community Section

## Purpose

Let users quickly choose how they want to support the mosque and wider community.

## Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ SUPPORT THE COMMUNITY                                        │
│                                                              │
│ [Money] [Blood] [Volunteer] [Goods] [Custom Support]         │
└──────────────────────────────────────────────────────────────┘
```

Each support option includes:

- icon
- category name
- short description
- Explore button

Categories:

- Money
- Blood
- Volunteer
- Goods
- Custom Support

---

# 3B. Impact Section

## Purpose

Show the platform’s real community contribution using database-based statistics.

## Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ OUR IMPACT                                                   │
│                                                              │
│ [Verified Mosques] [Users Connected] [Campaigns Completed]   │
│ [Volunteers Connected] [Blood Requests Fulfilled]            │
└──────────────────────────────────────────────────────────────┘
```

Possible counters:

- Verified mosques
- Registered users
- Active followers
- Completed campaigns
- Volunteer applications
- Blood requests fulfilled

**(Suggested: Use only real counts from the database. Do not use fake placeholder impact numbers in the final version.)**

---

# 3C. About MosqueConnect Section

## Purpose

Briefly explain what MosqueConnect is and why users should trust it.

## Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ ABOUT MOSQUECONNECT                                          │
│                                                              │
│ MosqueConnect brings verified mosque information, prayer     │
│ times, announcements, events, and community support into     │
│ one organized platform.                                     │
│                                                              │
│ [Learn More About Us]                                        │
└──────────────────────────────────────────────────────────────┘
```

Suggested content:

- one short heading
- two or three lines of description
- verified-information explanation
- Learn More button

**(Suggested: Keep the full mission, team, and verification process on the separate About Us page.)**

---

# 3D. Footer Section

## Purpose

Provide final navigation, contact, help, and legal information.

## Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ MosqueConnect                                                │
│ Verified mosque and community information in one place.      │
│                                                              │
│ Quick Links        Community        Support                  │
│ Home               Announcements    Money                    │
│ Browse Mosques     Events           Blood                    │
│ About              Lost & Found     Volunteer                │
│ Contact            Complaints       Goods / Custom           │
│                                                              │
│ Help & Legal                                                 │
│ FAQ | Privacy Policy | Terms | Report an Issue               │
│                                                              │
│ Contact: Email | Phone | Social Links                        │
│                                                              │
│ © MosqueConnect                                              │
└──────────────────────────────────────────────────────────────┘
```

**(Suggested: Keep the footer visually separate using a darker background and clear column headings.)**
# 4. Browse Mosques Page

## 4.1 Page Goal

The **Browse Mosques** page is the main mosque-discovery page. Unlike the Home page, this page contains search, filtering, view switching, sorting, pagination, and expanded browsing controls.

The user can:

- search by mosque name
- filter by location, distance, and facilities
- switch between **List View** and **Map View**
- sort results
- choose results per page
- browse page numbers
- select a mosque to see more details

This page should follow the structure shown in the provided sketch.

## 4.2 Top-Level Layout

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ HEADER / NAVBAR                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│ PAGE TITLE: Browse Mosques                                                 │
│                                                    [Toggle: List | Map]    │
├───────────────────┬────────────────────────────────────────────────────────┤
│ FILTER SIDEBAR    │ MAIN BROWSING AREA                                     │
│                   │                                                        │
│ Location          │ Search Bar                                             │
│ Distance          │ View-specific controls                                 │
│ Facility Filters  │ Results                                                │
│ Verified          │ Pagination                                             │
└───────────────────┴────────────────────────────────────────────────────────┘
```

## 4.3 View Toggle

At the top right corner of the page, there will be a toggle:

```text
[List View] [Map View]
```

Behaviour:

- Only one view is active at a time.
- The active view stays highlighted.
- Switching view should keep the currently applied search and filters.
- **(Suggested: Preserve the selected view in session/local storage so the user returns to the same mode.)**

---

## 4.4 Left Sidebar Filters

The left side contains the filtering panel for both list and map view.

### Sidebar Fields

1. **Location**
   - dropdown
   - can contain division / district / area / locality depending on implementation
   - **(Suggested: use dependent dropdowns if needed, e.g. District → Area)**

2. **Distance**
   - range input or two fields:
   - from: ___
   - to: ___
   - example: 1 km to 2 km / or 100 m to 2000 m
   - based on the sketch: “distance between eto and eto”

3. **Filter Button**
   - applies the selected filters

4. **Optional Reset Button**
   - clears all filters
   - **(Suggested: useful, even if not shown in the sketch)**

### Facility / Attribute Checkboxes

- Mosque Type
- Women’s Prayer Area
- Child Care Facility
- Parking
- AC Availability
- Wudu Facility
- Verified Mosque

**(Suggested: If “Mosque Type” has multiple options, show it as a dropdown or checkbox group instead of a single checkbox.)**

### Sidebar Wireframe

```text
┌────────────────────┐
│ Search by mosque   │   ← shown in main area, not inside sidebar
├────────────────────┤
│ Location [▼]       │
│                    │
│ Distance           │
│ [ 1 ] to [ 2 ] km  │
│                    │
│ [Filter]           │
│ [Reset]            │
│                    │
│ ☐ Mosque Type      │
│ ☐ Women’s Prayer   │
│ ☐ Child Care       │
│ ☐ Parking          │
│ ☐ AC Availability  │
│ ☐ Wudu Facility    │
│ ☐ Verified Mosque  │
└────────────────────┘
```

---

## 4.5 Search Bar

At the top of the main browsing area:

```text
[Search by mosque name...]
```

Behaviour:

- searches mosque names
- can optionally search area names too
- updates results based on the current filters and active view
- **(Suggested: allow pressing Enter or clicking a search icon)**

---

# 4A. List View

## 4A.1 List View Purpose

List View provides structured mosque browsing with controls like results-per-page, sort-by, page navigation, and display style options.

## 4A.2 List View Top Controls

Above the result list, show:

- **Results per page**
- **Page number selection / pagination**
- **Sort by**
- **Display style switch** (list / compact icons / other display mode)

Wireframe:

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [Results per page: 6 ▼]     <<  <  1  2  3 ... >  >>                │
│                                                      [Sort by ▼]     │
│                                              [List] [Grid/Icon] [...]│
└──────────────────────────────────────────────────────────────────────┘
```

### Controls Description

#### Results per page
Examples:

- 6
- 9
- 12
- 18

#### Page number selection
Examples:

- previous / next
- page number buttons
- first / last
- **(Suggested: if result count is large, use compact pagination like 1 2 3 ... 10)**

#### Sort by
Possible options:

- Distance
- Name
- Next Jamat
- Recently Updated
- Most Followed

#### Display style
As shown in your sketch:

- list icon
- grid/icon option
- another alternate compact style if needed

**(Suggested: Even if you finally implement only List and Grid, keep the UI flexible enough for extension.)**

---

## 4A.3 List Result Area

Below the controls, mosque results will appear as a list of cards.

Each mosque card should contain:

- Mosque Name
- Verified or not
- Location
- Distance away
- Next Jamat
- Jamat time
- Facilities
- Buttons

### Mosque Card Wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Mosque Name                             [Verified / Not Verified]    │
│ Location: Dhanmondi                                              │
│ 60 m away                                                        │
│ Next Jamat: Maghrib 6:45 PM                                      │
│                                                                  │
│ Facilities:                                                      │
│ - Women’s Prayer                                                 │
│ - Child Care                                                     │
│ - Parking                                                        │
│ - ...                                                            │
│                                                                  │
│ [View Profile]   [Get Directions]   [Follow]                     │
└──────────────────────────────────────────────────────────────────────┘
```

### Mosque Card Details Based on Your Sketch

- name
- verification status
- location
- distance away
- next jamat
- exact jamat time
- facilities list/icons
- View Profile button
- Get Directions button
- Follow button

**(Suggested: Use small facility icons beside text labels for a cleaner UI.)**

### Card Interaction

- clicking the card can select/highlight it
- clicking **View Profile** opens the full mosque profile page
- clicking **Get Directions** opens direction flow
- clicking **Follow** allows the user to follow the mosque
- **(Suggested: If donation is only for verified mosques, show that later on the mosque profile or donation flow, not necessarily on this page.)**

---

## 4A.4 List View Selection Behaviour

From your sketch, it appears that selecting a mosque in the list can show a detail area.

Recommended behaviour:

- clicking a mosque card selects it
- a selected state becomes visible
- optionally a quick-detail panel or expanded card can appear
- **(Suggested: simplest implementation is expandable cards or a right-side detail panel on large screens)**

---

# 4B. Map View

## 4B.1 Map View Purpose

Map View is similar to the Home page map, but more expanded and meant for active browsing.

## 4B.2 Map View Layout

- left sidebar stays visible for filters
- main area contains a larger interactive map
- next to or below the map, show the selected mosque details
- the map is more browsing-focused than the Home page

Wireframe:

```text
┌───────────────────┬──────────────────────────────────────────────────────┐
│ FILTER SIDEBAR    │ MAP VIEW                                             │
│                   │                                                      │
│ Location [▼]      │ [Interactive Map with many mosque markers]          │
│ Distance          │                                                      │
│ [1] to [2] km     │                                                      │
│ [Filter]          │                                                      │
│ Checkboxes...     │                                                      │
│                   │                                                      │
│                   ├──────────────────────────────────────────────────────┤
│                   │ SELECTED MOSQUE DETAILS                              │
│                   │ Mosque Name [Verified]                               │
│                   │ Location                                             │
│                   │ Distance                                             │
│                   │ Next Jamat                                           │
│                   │ Facilities                                           │
│                   │ [View Profile] [Get Directions] [Follow]             │
└───────────────────┴──────────────────────────────────────────────────────┘
```

## 4B.3 Map View Behaviour

- map is interactive
- mosque markers are plotted according to the current search and filters
- clicking a marker updates the selected mosque detail area
- the selected marker becomes highlighted
- filters update the visible markers
- search updates the visible markers
- pagination is not necessary in the map itself, but may still be used for any linked result list if included
- **(Suggested: optionally show a small marker popup with mosque name + next jamat)**

## 4B.4 Difference from Home Page Map

Home Page Map:
- simpler
- no search and filter
- automatically loads based on user location
- meant for quick discovery

Browse Mosques Map View:
- expanded
- includes search and filtering
- meant for detailed browsing and comparison
- supports switching between map and list view

---

## 4.6 Shared Result Logic

Both List View and Map View should use the same filtered result set.

That means:

- same search query
- same location filter
- same distance filter
- same facilities filter
- same verified filter

When switching between views:

- results stay consistent
- selected filters stay applied
- user does not lose context

---

## 4.7 Empty State

If no mosque matches the filters:

```text
No mosques found for the selected search and filters.

[Reset Filters]
[Try Another Location]
```

---

## 4.8 Mobile Behaviour

On mobile:

- filter sidebar becomes a collapsible drawer or filter modal
- view toggle remains visible near the top
- list view shows cards in one column
- map view shows full-width map
- selected mosque details appear as a bottom sheet or below the map
- controls such as results per page may be simplified on mobile

**(Suggested: On mobile, you may hide some advanced pagination controls and keep only Previous / Next.)**

---

## 4.9 Browse Mosques Acceptance Criteria

- The page contains a search bar.
- The page contains a view toggle at the top right: List View / Map View.
- The left sidebar contains filtering options.
- Location filter uses a dropdown.
- Distance filter allows a range (from–to).
- List View shows results per page, pagination, sort by, and display-style controls.
- Mosque list cards show the fields from the sketch.
- Map View is similar to the Home page but expanded.
- Switching between List and Map keeps the current search and filters.
- Selected mosque details update correctly in both views.
# 5. Mosque Profile Page

## 5.1 Page Goal

Provide one trusted source for a mosque’s prayer times, facilities, announcements, events, and community activities.

## 5.2 Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Mosque Cover Image                                           │
│ Mosque Name [Verified]                                       │
│ Address | Distance | Contact                                 │
│ [Follow] [Get Directions] [Share]                            │
├──────────────────────────────────────────────────────────────┤
│ TODAY’S PRAYER / JAMAT TIMES                                 │
│ Fajr | Dhuhr | Asr | Maghrib | Isha | Jummah                │
├──────────────────────────────────────────────────────────────┤
│ TABS                                                         │
│ Overview | Timetable | Announcements | Events | Donations    │
├──────────────────────────────────────────────────────────────┤
│ OVERVIEW                                                     │
│ About mosque                                                 │
│ Facilities                                                   │
│ Imam / Committee contact                                     │
│ Photos                                                       │
│ Location map                                                 │
├──────────────────────────────────────────────────────────────┤
│ RECENT ANNOUNCEMENTS                                         │
│ UPCOMING EVENTS                                              │
│ ACTIVE CAMPAIGNS                                             │
└──────────────────────────────────────────────────────────────┘
```

## 5.3 Mosque Information

- Name
- Verified status
- Full address
- Phone
- Email
- Website / social link
- Description
- Mosque type
- Imam name
- Committee contact
- Photos
- Latitude and longitude

## 5.4 Prayer Times

- Fajr
- Dhuhr
- Asr
- Maghrib
- Isha
- Jummah sessions
- Effective start and end date
- **(Suggested: Show both Adhan time and Jamat time when available.)**
- **(Suggested: Highlight the next Jamat automatically.)**

## 5.5 Facility Badges

- Women’s prayer space
- Child care facility
- Parking
- Wudu facility
- Air conditioning
- **(Suggested: Wheelchair access)**
- **(Suggested: Lift / accessible entrance)**
- **(Suggested: Drinking water)**

## 5.6 Announcements

Announcement card:

```text
[Urgency Badge]
Title
Short description
Published date and time
Published by verified mosque admin
[Read More]
```

Urgency levels:

- Normal
- Important
- Urgent

## 5.7 Admin Edit Access

- Edit button visible only to the approved mosque admin.
- **(Suggested: Display “Pending verification” instead of a verified badge while the claim is under review.)**

---

# 6. Donations & Community Support Landing Page

## 6.1 Page Goal

Let users choose how they want to support the community.

## 6.2 Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ PAGE TITLE: How would you like to contribute today?          │
├──────────────────────────────────────────────────────────────┤
│ [Money] [Blood] [Volunteer] [Goods] [Custom]                 │
├──────────────────────────────────────────────────────────────┤
│ Featured / Urgent Support Requests                           │
│ [Card] [Card] [Card]                                         │
├──────────────────────────────────────────────────────────────┤
│ My Recent Support Activity (logged-in users)                 │
└──────────────────────────────────────────────────────────────┘
```

**(Suggested: Use five large category cards instead of small tabs on the first visit. After selecting one, use tabs to switch categories.)**

---

# 7. Money Donation Page

## 7.1 Page Goal

Allow users to view mosque donation campaigns and record or complete a donation.

## 7.2 Campaign List

Filters:

- Mosque
- Purpose
- Location
- Urgent
- Status
- **(Suggested: Verified campaigns only toggle.)**

Campaign card:

```text
Mosque Name [Verified]
Campaign Title
Purpose: Zakat / Charity / Construction / Maintenance / Others
Target Amount
Collected Amount
Progress Bar
Deadline
[View Details] [Donate]
```

## 7.3 Donation Form

Fields:

- Select mosque
- Select campaign
- Amount
- Purpose
- Donor name
- Phone / email
- Anonymous donation checkbox
- Payment method
- **(Suggested: Donation message / note)**
- **(Suggested: Consent checkbox before payment)**

Buttons:

- Continue to Payment
- Cancel

## 7.4 Payment

- Payment gateway redirect or embedded payment section
- Success page
- Failed payment page
- Donation receipt
- **(Suggested: Until online payment integration is completed, support an “Offline donation instruction” mode with admin confirmation.)**

---

# 8. Blood Support Page

## 8.1 Page Goal

Show active blood requests and allow eligible users to respond or register as donors.

## 8.2 Blood Request Filters

- Blood group
- Location
- Hospital
- Distance
- Date / urgency
- **(Suggested: Only active requests toggle.)**

## 8.3 Blood Request Card

```text
Blood Group: B+
Hospital
Location
Patient age
Required date and time
Distance
Units needed
Request status

[View Details] [I Can Donate] [Call] [Share]
```

## 8.4 Blood Request Details

- Patient initials or reference name
- Blood group
- Units required
- Hospital
- Ward / department
- Required date and time
- Contact person
- Contact number
- Additional note
- Verification status
- **(Suggested: Avoid displaying unnecessary sensitive medical information publicly.)**

## 8.5 Donor Registration Form

Fields:

- Name
- Blood group
- Location
- Phone
- Email
- Availability
- Last donation date
- Preferred contact method
- **(Suggested: Eligibility confirmation checkbox)**
- **(Suggested: Privacy consent checkbox)**

Buttons:

- Register as Donor
- Update Availability

---

# 9. Volunteer Opportunities Page

## 9.1 Page Goal

Help users discover and apply for mosque and community volunteer work.

## 9.2 Filters

- Nearby
- Date
- Time
- Weekend
- Category
- Required skill
- **(Suggested: Remote / on-site filter)**

## 9.3 Volunteer Card

```text
Mosque Name
Role / Task
Location
Date and Time
Volunteers Needed
Required Skills
Application Deadline

[View Details] [Apply]
```

## 9.4 Volunteer Details

- Mosque name
- Task title
- Full description
- Date and time
- Location
- Number of volunteers needed
- Required skills
- Contact information
- **(Suggested: Safety instructions)**
- **(Suggested: Organizer verification status)**

## 9.5 Application Form

Fields:

- Name (auto-filled when logged in)
- Phone number
- Email
- Preferred time
- Relevant skill
- Previous experience
- Additional note

Button:

- Submit Application

**(Suggested: Guests may view opportunities, but login should be required to apply.)**

---

# 10. Goods Donation Page

## 10.1 Page Goal

Show goods needed by mosques and allow donors to commit to providing items.

## 10.2 Filters

- Nearby
- Urgent
- Category
- Mosque
- Status

## 10.3 Goods Request Card

```text
Mosque Name
Location
Item Needed
Reason
Quantity Needed
Quantity Received
Remaining Quantity
Progress
Priority

[View Details] [Donate Item]
```

## 10.4 Request Details

- Item name
- Category
- Description
- Requested by
- Reason
- Quantity needed
- Quantity received
- Remaining quantity
- Priority
- Preferred delivery method
- Deadline
- Mosque contact

## 10.5 Goods Donation Form

Fields:

- Item name
- Quantity
- Item condition
- Expected delivery date
- Delivery method
- Phone number
- Additional note

Buttons:

- Confirm Donation
- Cancel

**(Suggested: Add item-condition options: New / Gently Used / Used.)**  
**(Suggested: Mosque admin should confirm receipt before the progress count is updated.)**

---

# 11. Custom Support Page

## 11.1 Page Goal

Allow users to offer support that does not fit the predefined categories.

## 11.2 Intro Text

“Can’t find the type of support you are looking for? Tell us how you would like to help.”

## 11.3 Form

Support type dropdown:

- Sponsor an event
- Sponsor an Islamic class
- Support an orphan program
- Provide a professional service
- Donate equipment
- Provide transportation
- Others

Fields:

- Selected mosque or community
- Support title
- Description
- Availability / preferred date
- Contact details
- Attachment
- **(Suggested: Estimated value or quantity)**
- **(Suggested: Preferred response method)**

Button:

- Submit Support Offer

---

# 12. Community Hub

## 12.1 Page Goal

Provide one organized and moderated place for all mosque and community information that people currently learn through mosque microphones, posters, WhatsApp/Facebook groups, or word of mouth.

## 12.2 Main Community Categories

```text
[Announcements] [Events] [Blood Requests] [Volunteer]
[Lost & Found] [Complaints / Suggestions] [Other Notices]
```

## 12.3 Community Page Layout

```text
┌──────────────────────────────────────────────────────────────┐
│ COMMUNITY                                                    │
│ “Stay updated with mosque and community information.”        │
├──────────────────────────────────────────────────────────────┤
│ [Search announcements, events, or community notices...]      │
│ [Category ▼] [Mosque ▼] [Area ▼] [Date ▼] [Urgent Only]     │
├──────────────────────────────────────────────────────────────┤
│ IMPORTANT / URGENT ANNOUNCEMENTS                             │
│ [Announcement Card] [Announcement Card]                      │
├──────────────────────────────────────────────────────────────┤
│ LATEST COMMUNITY FEED                                        │
│ [Prayer Time Update]                                         │
│ [Janazah Announcement]                                       │
│ [Event Notice]                                               │
│ [Blood Request]                                              │
│ [Volunteer Opportunity]                                      │
│ [Lost & Found]                                               │
├──────────────────────────────────────────────────────────────┤
│ [Load More] / Pagination                                     │
└──────────────────────────────────────────────────────────────┘
```

## 12.4 Announcements Section

Announcements include all official mosque information that is normally shared through mosque microphones, posters, group messages, or word of mouth.

### Announcement Types

- Prayer time or Jamat time update
- Jummah time or additional Jummah session
- Eid prayer time and location
- Janazah announcement
- Ramadan Sehri, Iftar, and Taraweeh update
- Mosque event, Islamic lecture, or class announcement
- Donation or charity campaign announcement
- Mosque construction, repair, or maintenance notice
- Temporary mosque closure or entrance change
- Wudu area, parking, women’s section, or child-care facility update
- Imam, khatib, or guest speaker announcement
- Community meeting notice
- Emergency or urgent public notice
- **(Suggested: Weather-related prayer or event changes)**
- **(Suggested: Road closure or access problem near the mosque)**
- **(Suggested: Electricity, water, or facility disruption notice)**

## 12.5 Announcement Card

```text
[Urgency Badge] [Announcement Type]

Announcement Title
Mosque Name [Verified Badge]
Area / Location

Short description...

Published: Date and Time
Last updated: Date and Time

[Read Details] [Follow Mosque] [Share]
```

Urgency levels:

- Normal
- Important
- Urgent

## 12.6 Announcement Details Page / Modal

Fields shown:

- Announcement title
- Announcement type
- Mosque name
- Verified status
- Full description
- Effective date and time
- Expiry date and time
- Related prayer or event time
- Location
- Attachment or poster
- Published by
- Last updated time
- Contact information
- Share button

**(Suggested: Use a full page for long announcements and a modal for short announcements.)**

## 12.7 Announcement Behaviour

- Verified mosque admins publish official mosque announcements.
- Registered users receive alerts from the mosques they follow.
- Urgent announcements appear at the top of the Community page.
- Expired announcements are removed from the active feed automatically.
- Prayer time changes link directly to the mosque timetable.
- Event announcements link to the Community Events details.
- Donation announcements link to the related campaign.
- **(Suggested: Show “Official Mosque Announcement” on posts created by verified mosque admins.)**
- **(Suggested: General users may submit community notices, but these should remain pending until moderator approval.)**
- **(Suggested: Add a “Report incorrect information” action.)**

## 12.8 Community Feed Filters

- All
- Announcements
- Prayer time updates
- Janazah
- Events
- Donation campaigns
- Blood requests
- Volunteer opportunities
- Lost & Found
- Complaints / Suggestions
- Other notices
- Mosque
- Area
- Date
- Urgent only

## 12.9 Community Feed Card

```text
[Category Icon] [Status / Urgency Badge]

Title
Mosque / Area
Short Description
Published Time

[View Details] [Share]
```

## 12.10 Posting Permissions

| Content Type | Who Can Publish? | Approval Required? |
|---|---|---|
| Official mosque announcement | Verified Mosque Admin | No |
| Prayer/Jamat time update | Verified Mosque Admin | No |
| Event notice | Verified Mosque Admin | No |
| Donation campaign notice | Verified Mosque Admin | No |
| Blood request | Registered User / Mosque Admin | (Suggested: Yes, for public visibility) |
| Volunteer opportunity | Mosque Admin | No |
| Lost & Found | Registered User | (Suggested: Yes) |
| Complaint / Suggestion | Registered User | Private review |
| General community notice | Registered User / Mosque Admin | (Suggested: Yes, if posted by a user) |

**(Suggested: Keep official mosque announcements visually separate from user-generated community posts so people can easily understand which information is verified.)**

## 12.11 Events Placement

Events will stay inside the Community section:

```text
Community
→ Events
→ Event Details
```

The Community page shows an **Upcoming Events** block and a **View All Events** button.

## 12.12 Avoiding Duplicate Modules

Blood, Volunteer, Lost & Found, and other support items may be reachable from both **Support** and **Community**, but both links must open the same database records and pages.

**(Suggested: Community should work as the main information feed, while Support should work as the action-oriented page where users donate, volunteer, or respond.)**
# 13. Lost & Found Page

## 13.1 List View

Filters:

- Lost / Found
- Category
- Location
- Date
- Status

Card:

```text
[Item Image]
Lost / Found Badge
Item Name
Location
Date
Short Description
[View Details]
```

## 13.2 Create Post Form

Fields:

- Post type: Lost / Found
- Item name
- Category
- Description
- Mosque / location
- Date and time
- Contact method
- Image
- **(Suggested: Hide direct phone number and use in-app contact where possible.)**

Button:

- Submit Post

## 13.3 Status

- Open
- Matched
- Returned
- Closed

---

# 14. Complaints / Suggestions Page

## 14.1 Page Goal

Allow users to send structured feedback to a mosque or platform administrator.

## 14.2 Form

Fields:

- Complaint or suggestion
- Select mosque / platform
- Subject
- Category
- Description
- Attachment
- Anonymous submission option
- **(Suggested: Urgency level)**
- **(Suggested: Contact permission checkbox)**

Button:

- Submit

## 14.3 User Tracking

Logged-in users can see:

- Submission date
- Status
- Admin response
- Resolution date

Statuses:

- Submitted
- Under Review
- Resolved
- Rejected

---

# 15. Community Events Section

## 15.1 Placement

Events will not have a separate top-level navigation item. Users will open:

```text
Community
→ Events
→ Event Details
```

## 15.2 Event List

Filters:

- Mosque
- Location
- Date
- Category
- Free / registration required
- **(Suggested: Family-friendly / women-only / children-friendly filters)**

Event card:

```text
[Event Image]
Event Title
Mosque Name
Date and Time
Location
Category
Available Seats
[View Details]
```

## 15.3 Event Details

- Title
- Description
- Mosque
- Speaker / organizer
- Date and time
- Location
- Registration requirement
- Contact
- Share button
- **(Suggested: Add to Google Calendar button)**
- **(Suggested: Attendance limit and registration status)**

## 15.4 Community Page Behaviour

- The Community page shows an **Upcoming Events** section near the top.
- Users can open **View All Events** to see the full event list.
- Mosque Admins create and manage events from the Mosque Admin Dashboard.
- Event notifications remain available for users who follow a mosque.
# 16. Ramadan Mode Page

## 16.1 Page Goal

Provide mosque-specific Ramadan information.

## 16.2 Sections

- Sehri ending time
- Iftar time
- Taraweeh time
- Jummah time
- Special lectures
- I'tikaf information
- Zakat / Fitra information
- Ramadan announcements
- **(Suggested: Ramadan mode should appear in the navbar only during Ramadan or remain available under More.)**

---

# 17. Login Page

## Wireframe

```text
[Logo]

Welcome Back

Email
Password
[Remember Me] [Forgot Password?]

[Login]

New user? Register
```

**(Suggested: Add rate-limiting and lockout messages after repeated failed attempts.)**

---

# 18. Registration Page

Fields:

- Full name
- Email
- Phone
- Password
- Confirm password
- Agree to terms
- Register

Optional:

- Blood group
- Location
- **(Suggested: Keep blood group optional and explain why it is requested.)**

Links:

- Already have an account? Login
- Register / Claim as Mosque Admin

---

# 19. User Dashboard

## 19.1 Summary Cards

- Followed mosques
- Unread notifications
- Volunteer applications
- Donation commitments
- Blood donor availability

## 19.2 Sections

- Next Jamat from followed mosques
- Recent announcements
- Upcoming events
- Active support requests nearby
- My recent activity
- **(Suggested: Quick toggle for blood donor availability.)**

---

# 20. User Profile and Settings

Sections:

- Personal information
- Contact information
- Location
- Password change
- Notification preferences
- Privacy settings
- Blood donor profile
- Delete account
- **(Suggested: Download personal data request)**

Notification preferences:

- Prayer time changes
- Urgent announcements
- Events
- Donation campaigns
- Volunteer opportunities
- Blood requests

---

# 21. Notifications Page

Filters:

- All
- Prayer times
- Announcements
- Events
- Donations
- Community

Notification item:

```text
[Icon]
Title
Short message
Mosque name
Time
Unread indicator
[Open]
```

Actions:

- Mark as read
- Mark all as read
- Delete
- **(Suggested: Group notifications by date.)**

---

# 22. Mosque Admin Registration / Claim Page

## 22.1 Claim Flow

```text
Register/Login
    ↓
Search Existing Mosque
    ↓
Select Mosque or Add New Mosque
    ↓
Submit Claim Form + Proof
    ↓
Pending Review
    ↓
Approved / Rejected
```

## 22.2 Claim Form

Fields:

- Applicant name
- Role in mosque
- Mosque name
- Mosque address
- Contact number
- Official email
- Proof document
- Committee member reference
- Explanation
- **(Suggested: National ID should not be collected unless genuinely required.)**

Status page:

- Pending
- Approved
- Rejected
- More information required

---

# 23. Mosque Admin Dashboard

## 23.1 Overview

Cards:

- Followers
- Today’s views
- Active announcements
- Upcoming events
- Active campaigns
- Pending volunteer applications

## 23.2 Menu

- Dashboard
- Mosque Profile
- Prayer Times
- Announcements
- Events
- Donations
- Goods Requests
- Volunteer Opportunities
- Community Posts
- Followers
- Settings

## 23.3 Prayer Time Management

- Add timetable
- Effective start date
- Effective end date
- Set daily Jamat times
- Set Jummah sessions
- Preview
- Publish
- **(Suggested: Warn the admin before replacing an active timetable.)**

## 23.4 Announcement Management

Fields:

- Title
- Announcement type
- Description
- Urgency
- Effective date and time
- Expiry date and time
- Related prayer / event / campaign
- Location
- Attachment or poster
- Send notification checkbox
- Pin to top checkbox
- Publish now / schedule publication

Announcement types:

- Prayer or Jamat time update
- Jummah update
- Eid prayer
- Janazah
- Ramadan update
- Event or class
- Donation campaign
- Construction or maintenance
- Temporary closure
- Facility update
- Community meeting
- Emergency notice
- Other

Actions:

- Create
- Save draft
- Preview
- Publish
- Edit
- Archive
- Delete

## 23.5 Event Management

Fields:

- Event title
- Description
- Date
- Time
- Location
- Speaker
- Capacity
- Registration required
- Poster image

## 23.6 Donation Campaign Management

- Create campaign
- Purpose
- Target amount
- Current amount
- Deadline
- Description
- Status
- Update progress
- **(Suggested: Keep an audit history of amount changes.)**

---

# 24. Super Admin Dashboard

## 24.1 Summary Cards

- Total users
- Registered mosques
- Verified mosques
- Pending claims
- Active reports
- Community posts pending moderation

## 24.2 Main Modules

- Mosque claim approval
- User management
- Mosque management
- Content moderation
- Complaint management
- Reported posts
- Platform statistics
- System settings

## 24.3 Claim Review

Display:

- Applicant information
- Mosque information
- Uploaded proof
- Previous claims
- Admin notes

Actions:

- Approve
- Reject
- Request more information

**(Suggested: Require a rejection reason.)**  
**(Suggested: Keep an audit log of every moderation action.)**

---

# 25. About Us Page

Sections:

- Platform mission
- Problem being solved
- How MosqueConnect works
- Verification process
- Team
- Contact
- **(Suggested: Add a short “MosqueConnect does not replace mosque authority” statement.)**

---

# 26. Contact Page

Fields:

- Name
- Email
- Subject
- Category
- Message
- Attachment
- Submit

Categories:

- General inquiry
- Technical issue
- Mosque information correction
- Partnership
- Safety concern
- Other

---

# 27. Help / FAQ Page

Suggested questions:

- How is a mosque verified?
- Who can edit mosque information?
- How do I follow a mosque?
- How do notifications work?
- How can I report incorrect information?
- How do I claim a mosque?
- How are donation campaigns managed?
- How is blood donor privacy protected?

---

# 28. Empty, Error, and Loading States

## Empty States

Examples:

- No mosque found
- No events available
- No active campaign
- No notifications
- No volunteer opportunity

Each empty state should include:

- Friendly message
- Simple icon
- Clear next action
- Reset filters button where relevant

## Errors

- 403 — Access denied
- 404 — Page not found
- 419 — Session expired
- 500 — Server error

## Loading

- Map loading
- Results loading
- Form submitting
- Payment processing
- Notification loading

**(Suggested: Never leave the user with only a spinner; show what is being loaded.)**

---

# 29. Responsive Behaviour

## Desktop

- Filter sidebar + result area
- Map and list side by side
- Full navbar

## Tablet

- Collapsible filter panel
- Two-column card layout
- Simplified navbar

## Mobile

- Hamburger menu
- One-column cards
- Map/List tabs
- Bottom sticky actions on detail pages
- Full-width forms
- **(Suggested: Keep primary buttons at least 44px high for touch accessibility.)**

---

# 30. Accessibility Requirements

- Proper label for every form field
- Keyboard navigation
- Visible focus state
- Alternative text for images
- Good colour contrast
- Error text must not depend only on colour
- Accessible modal behaviour
- **(Suggested: Support English and Bangla-ready layouts even if Bangla is implemented later.)**

---

# 31. Security and Privacy Notes

- Role-based access control
- CSRF protection
- Secure password hashing
- Server-side validation
- File upload type and size validation
- Rate limiting
- Audit logs for admin actions
- Minimal collection of personal data
- Blood donor contact privacy
- Payment data must not be stored directly
- **(Suggested: Add a report button for suspicious campaigns, posts, or accounts.)**

---

# 32. Recommended URL Routes

```text
/
 /mosques
 /mosques/{slug}
 /support
 /support/money
 /support/blood
 /support/volunteer
 /support/goods
 /support/custom
 /community
 /community/announcements
 /community/announcements/{id}
 /community/events
 /community/events/{id}
 /community/lost-found
 /community/complaints
 /ramadan
 /about
 /contact
 /help

 /login
 /register
 /dashboard
 /profile
 /notifications
 /my-support
 /my-volunteering

 /mosque-admin/claim
 /mosque-admin/dashboard
 /mosque-admin/profile
 /mosque-admin/prayer-times
 /mosque-admin/announcements
 /mosque-admin/events
 /mosque-admin/campaigns
 /mosque-admin/goods
 /mosque-admin/volunteers

 /admin
 /admin/mosque-claims
 /admin/mosques
 /admin/users
 /admin/moderation
 /admin/reports
```

---

# 33. Standard Markdown Template for Any New Page

Use this format whenever a new page is added:

```md
# Page Name

## 1. Page Goal
Write one or two sentences explaining what the page helps the user do.

## 2. Role Access
- Visitor:
- Registered User:
- Mosque Admin:
- Super Admin:

## 3. Main Layout
Describe the page from top to bottom.

## 4. Components
- Header
- Search
- Filter
- Cards
- Form
- Footer

## 5. Data Fields
List every field shown or submitted.

## 6. User Actions
- View
- Search
- Filter
- Submit
- Edit
- Delete

## 7. Validation
Write required fields and error cases.

## 8. Page States
- Loading
- Empty
- Error
- Success

## 9. Responsive Behaviour
Explain desktop, tablet, and mobile layout.

## 10. Access and Security
Explain which role can perform each action.

## 11. Suggested Improvements
- (Suggested: ...)
```

---

# 34. Recommended Development Priority

## Phase 1 — Core MVP

1. Authentication and roles
2. Home page map
3. Browse mosques
4. Mosque profile
5. Mosque admin claim and verification
6. Prayer timetable
7. Follow mosque
8. Notifications
9. Announcements

## Phase 2 — Community Features

1. Community Hub
2. Community Events
3. Money campaigns
4. Goods requests
5. Volunteer opportunities
6. Blood requests
7. Lost & Found
8. Complaints

## Phase 3 — Final Polish

1. Ramadan mode
2. Responsive improvements
3. Accessibility
4. Automated testing
5. Docker and CI/CD
6. VPS deployment
7. Documentation

**(Suggested: Do not build every support module at the same time. Complete one full vertical feature first—database, API, frontend, authorization, testing—then copy the pattern to the next module.)**

---

# 35. Final Navigation Recommendation

```text
Logo | Home | Browse Mosques | Support | Community | More
                                                     ├── Ramadan
                                                     ├── About
                                                     ├── Contact
                                                     └── Help

Right Side:
Search | Notification | Profile
```

**(Suggested: Use “Support” in the navbar instead of “Donations” because it includes money, blood, volunteering, goods, and custom support. The page heading may still say “Donations & Community Support.”)**

**(Your decision: Events will stay inside the Community section, so no separate Events item will appear in the main navbar.)**

**(Your decision: Community will also contain all official mosque announcements, including prayer/Jamat updates and information normally shared by mosque microphones or word of mouth.)**

**(Your decision: On the home page, location is requested first; after the map loads, the nearest mosque is selected automatically and its details appear beside the map. Users may select another mosque marker, but search and filtering remain only on the Browse Mosques page.)**

**(Your decision: Below the home-page map, the order will be Support the Community → Impact → About MosqueConnect → Footer.)**

---

# 36. Final Notes for the Team

- The map is the main discovery tool.
- The mosque profile is the main trusted information page.
- Verification must remain visible throughout the UI.
- Normal users must never see mosque-admin edit controls.
- All community content needs moderation and status tracking.
- Forms must have proper validation and success/error feedback.
- Mobile design is essential because most users will access the platform by phone.
- The first working demo should focus on the complete user journey:

```text
Home Map
→ Browse Mosque
→ Mosque Profile
→ Follow
→ Notification
```

Then add:

```text
Support / Community
→ View Request
→ Submit Response
→ Admin Review
→ Status Update
```
