// Generator script for ZENO Classic UML Class Diagram
// Enhanced with zero-overlap spatial geometry, generous routing highways, and clean typography.
const fs = require('fs');
const path = require('path');

const classes = [
  // ── COLUMN 1 (x: 80, w: 340) ──────────────────────────────────────────────
  {
    id: 'Report',
    name: 'Report',
    stereotype: 'Mongoose Model',
    collection: 'reports',
    desc: 'System-wide and facility-specific analytical reports (revenue, occupancy, booking volume) exportable to CSV and PDF formats.',
    x: 80, y: 80, w: 340,
    attributes: [
      '- _id : ObjectId',
      '+ generatedBy : ObjectId [FK -> User]',
      '+ type : "revenue" | "volume" | "occupancy"',
      '+ format : "csv" | "pdf"',
      '+ buildingId : ObjectId [FK -> Building]',
      '+ dateFrom : Date',
      '+ dateTo : Date',
      '+ status : "processing" | "ready" | "failed"',
      '+ fileUrl : String',
      '+ createdAt : Date'
    ],
    methods: [
      '+ generateReport(filter: Object) : Promise<Report>',
      '+ writeCsv(filename: String, rows: Array) : String',
      '+ writePdf(filename: String, data: Object) : String'
    ]
  },
  {
    id: 'Building',
    name: 'Building',
    stereotype: 'Mongoose Model',
    collection: 'buildings',
    desc: 'Physical facility representation containing address, total floor count, geolocation coordinates, and owner linkage.',
    x: 80, y: 560, w: 340,
    attributes: [
      '- _id : ObjectId',
      '+ ownerId : ObjectId [FK -> User]',
      '+ name : String',
      '+ address : String',
      '+ totalFloors : Number',
      '+ location : { lat: Number, lng: Number }',
      '+ createdAt : Date',
      '+ updatedAt : Date'
    ],
    methods: [
      '+ createBuilding(data: Object) : Promise<Building>',
      '+ getBuildings() : Promise<Building[]>',
      '+ getBuildingById(id: ObjectId) : Promise<Building>',
      '+ updateBuilding(id: ObjectId, data: Object) : Promise<Building>',
      '+ deleteBuilding(id: ObjectId) : Promise<Boolean>'
    ]
  },
  {
    id: 'SlotBlackout',
    name: 'SlotBlackout',
    stereotype: 'Mongoose Model',
    collection: 'slotblackouts',
    desc: 'Time window blackout reservations created by owners for maintenance, private events, or scheduled closures.',
    x: 80, y: 1080, w: 340,
    attributes: [
      '- _id : ObjectId',
      '+ slot : ObjectId [FK -> Slot]',
      '+ owner : ObjectId [FK -> User]',
      '+ startDate : Date',
      '+ endDate : Date',
      '+ reason : String',
      '+ createdAt : Date',
      '+ updatedAt : Date'
    ],
    methods: [
      '+ createBlackout(data: Object) : Promise<SlotBlackout>',
      '+ getBlackoutsForSlot(slotId: ObjectId) : Promise<SlotBlackout[]>',
      '+ isBlackoutActive(slotId: ObjectId, s: Date, e: Date) : Promise<Boolean>',
      '+ removeBlackout(id: ObjectId) : Promise<Boolean>'
    ]
  },

  // ── COLUMN 2 (x: 580, w: 350) ──────────────────────────────────────────────
  {
    id: 'Notification',
    name: 'Notification',
    stereotype: 'Mongoose Model',
    collection: 'notifications',
    desc: 'Automated user alerts (booking confirmations, reminders, overstay alerts, payment receipts) with in-app & email dispatch.',
    x: 580, y: 80, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ userId : ObjectId [FK -> User]',
      '+ type : NotificationTypeEnum',
      '+ title : String',
      '+ message : String',
      '+ relatedId : ObjectId',
      '+ isRead : Boolean',
      '+ readAt : Date',
      '+ emailSent : Boolean',
      '+ createdAt : Date'
    ],
    methods: [
      '+ createNotification(data: Object) : Promise<Notification>',
      '+ markAsRead(id: ObjectId) : Promise<Notification>',
      '+ getUserNotifications(userId: ObjectId) : Promise<Notification[]>'
    ]
  },
  {
    id: 'Slot',
    name: 'Slot',
    stereotype: 'Mongoose Model',
    collection: 'parkingslots',
    desc: 'Individual parking space bay classified by type (standard, compact, large, EV), floor level, dimensions, and baseline rate.',
    x: 580, y: 560, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ building : ObjectId [FK -> Building]',
      '+ owner : ObjectId [FK -> User]',
      '+ slotNumber : String',
      '+ floor : Number',
      '+ type : SlotTypeEnum ["standard".."ev"]',
      '+ dimensions : { length: Number, width: Number }',
      '+ pricePerHour : Number',
      '+ pricePerDay : Number',
      '+ pricePerMonth : Number',
      '+ status : SlotStatus ["available".."inactive"]',
      '+ createdAt : Date',
      '+ updatedAt : Date'
    ],
    methods: [
      '+ createSlot(slotData: Object) : Promise<Slot>',
      '+ getSlotsByBuilding(buildingId: ObjectId) : Promise<Slot[]>',
      '+ checkAvailability(slotId: ObjectId, s: Date, e: Date) : Promise<Boolean>',
      '+ updateSlotStatus(id: ObjectId, status: String) : Promise<Slot>',
      '+ deleteSlot(id: ObjectId) : Promise<Boolean>'
    ]
  },
  {
    id: 'PricingRule',
    name: 'PricingRule',
    stereotype: 'Mongoose Model',
    collection: 'pricingrules',
    desc: 'Configurable dynamic pricing rule engine with surge/discount percentages, demand thresholds, time windows, and day filters.',
    x: 580, y: 1080, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ owner : ObjectId [FK -> User]',
      '+ building : ObjectId [FK -> Building]',
      '+ name : String',
      '+ slotType : String ["all", "standard", ...]',
      '+ floorFrom : Number',
      '+ floorTo : Number',
      '+ daysOfWeek : Number[] [0..6]',
      '+ timeStart : String [HH:MM]',
      '+ timeEnd : String [HH:MM]',
      '+ demandThreshold : Number [0..100]',
      '+ adjustmentType : "percentage" | "fixed"',
      '+ adjustmentValue : Number',
      '+ priority : Number',
      '+ active : Boolean'
    ],
    methods: [
      '+ createRule(data: Object) : Promise<PricingRule>',
      '+ getRulesByOwner(ownerId: ObjectId) : Promise<PricingRule[]>',
      '+ evaluateRules(slotId: ObjectId, time: Date) : Promise<Number>',
      '+ toggleActive(ruleId: ObjectId) : Promise<PricingRule>'
    ]
  },

  // ── COLUMN 3 (x: 1090, w: 360) ─────────────────────────────────────────────
  {
    id: 'User',
    name: 'User',
    stereotype: 'Mongoose Model',
    collection: 'users',
    desc: 'Central identity entity for all platform actors supporting role-based access control (Admin, Owner, Renter).',
    x: 1090, y: 60, w: 360,
    attributes: [
      '- _id : ObjectId',
      '+ name : String',
      '+ email : String',
      '- password : String',
      '+ role : "admin" | "owner" | "renter"',
      '+ address : String',
      '+ coordinates : String',
      '+ phone : String',
      '+ ownerCode : String',
      '+ isActive : Boolean',
      '+ createdAt : Date',
      '+ updatedAt : Date'
    ],
    methods: [
      '+ register(userData: Object) : Promise<User>',
      '+ login(credentials: Object) : Promise<AuthToken>',
      '+ getProfile(userId: ObjectId) : Promise<User>',
      '+ updateProfile(userId: ObjectId, data: Object) : Promise<User>',
      '+ changePassword(oldPw: String, newPw: String) : Promise<Boolean>'
    ]
  },
  {
    id: 'Booking',
    name: 'Booking',
    stereotype: 'Mongoose Model',
    collection: 'bookings',
    desc: 'Central reservation transaction handling lifecycle states, slot locking, pricing snapshots, and automatic expiration.',
    x: 1090, y: 560, w: 360,
    attributes: [
      '- _id : ObjectId',
      '+ renterId : ObjectId [FK -> User]',
      '+ slotId : ObjectId [FK -> Slot]',
      '+ vehicleId : ObjectId [FK -> Vehicle]',
      '+ seriesId : ObjectId [FK -> BookingSeries]',
      '+ startTime : Date',
      '+ endTime : Date',
      '+ status : BookingStatus ["pending".."cancelled"]',
      '+ totalAmount : Number',
      '+ pricingSnapshot : Object',
      '+ expiresAt : Date',
      '+ cancelReason : String',
      '+ createdAt : Date'
    ],
    methods: [
      '+ createBooking(data: Object) : Promise<Booking>',
      '+ cancelBooking(id: ObjectId, reason: String) : Promise<Booking>',
      '+ extendBooking(id: ObjectId, addHours: Number) : Promise<Booking>',
      '+ verifyOverlap(slotId: ObjectId, s: Date, e: Date) : Promise<Boolean>',
      '+ sweepExpiredBookings() : Promise<Number>'
    ]
  },
  {
    id: 'CheckInOut',
    name: 'CheckInOut',
    stereotype: 'Mongoose Model',
    collection: 'checkinouts',
    desc: 'Physical vehicle ingress and egress timestamp tracking for booked slots, activating live status and detecting overstays.',
    x: 1090, y: 1100, w: 360,
    attributes: [
      '- _id : ObjectId',
      '+ bookingId : ObjectId [FK -> Booking]',
      '+ checkInTime : Date',
      '+ checkOutTime : Date',
      '+ status : "pending" | "checked-in" | "checked-out"',
      '+ createdAt : Date',
      '+ updatedAt : Date'
    ],
    methods: [
      '+ recordCheckIn(bookingId: ObjectId) : Promise<CheckInOut>',
      '+ recordCheckOut(bookingId: ObjectId) : Promise<CheckInOut>',
      '+ detectOverstay(checkInOutId: ObjectId) : Promise<Boolean>'
    ]
  },
  {
    id: 'OverstayPenalty',
    name: 'OverstayPenalty',
    stereotype: 'Mongoose Model',
    collection: 'overstaypenalties',
    desc: 'Enforced monetary penalty calculated automatically when actual physical check-out exceeds the reserved booking end time.',
    x: 1090, y: 1480, w: 360,
    attributes: [
      '- _id : ObjectId',
      '+ bookingId : ObjectId [FK -> Booking]',
      '+ overstayDuration : Number [minutes]',
      '+ penaltyAmount : Number',
      '+ penaltyRatePerHour : Number',
      '+ notes : String',
      '+ createdAt : Date',
      '+ updatedAt : Date'
    ],
    methods: [
      '+ calculatePenalty(bookingId: ObjectId, actualOut: Date) : Promise<OverstayPenalty>',
      '+ getPenaltiesByBooking(bookingId: ObjectId) : Promise<OverstayPenalty[]>',
      '+ settlePenalty(penaltyId: ObjectId, paymentId: ObjectId) : Promise<Boolean>'
    ]
  },

  // ── COLUMN 4 (x: 1610, w: 350) ─────────────────────────────────────────────
  {
    id: 'Vehicle',
    name: 'Vehicle',
    stereotype: 'Mongoose Model',
    collection: 'vehicles',
    desc: 'Renter-registered vehicle profiles containing plate number, category, and size class for parking validation.',
    x: 1610, y: 80, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ userId : ObjectId [FK -> User]',
      '+ renterId : ObjectId [FK -> User]',
      '+ plateNumber : String',
      '+ type : String',
      '+ sizeClass : "small" | "medium" | "large"',
      '+ createdAt : Date'
    ],
    methods: [
      '+ addVehicle(data: Object) : Promise<Vehicle>',
      '+ getVehiclesByRenter(renterId: ObjectId) : Promise<Vehicle[]>',
      '+ updateVehicle(id: ObjectId, data: Object) : Promise<Vehicle>',
      '+ deleteVehicle(id: ObjectId) : Promise<Boolean>'
    ]
  },
  {
    id: 'BookingSeries',
    name: 'BookingSeries',
    stereotype: 'Mongoose Model',
    collection: 'bookingseries',
    desc: 'Recurring booking schedule container generating repeated daily/weekly booking occurrences across a designated date window.',
    x: 1610, y: 560, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ renterId : ObjectId [FK -> User]',
      '+ slotId : ObjectId [FK -> Slot]',
      '+ vehicleId : ObjectId [FK -> Vehicle]',
      '+ daysOfWeek : Number[] [0..6]',
      '+ timeStart : String [HH:MM]',
      '+ timeEnd : String [HH:MM]',
      '+ seriesStartDate : Date',
      '+ seriesEndDate : Date',
      '+ status : SeriesStatus ["active" | "cancelled"]',
      '+ totalOccurrences : Number',
      '+ bookedCount : Number',
      '+ skippedCount : Number',
      '+ occurrences : OccurrenceItem[]',
      '+ createdAt : Date'
    ],
    methods: [
      '+ createRecurringSeries(data: Object) : Promise<BookingSeries>',
      '+ cancelRecurringSeries(id: ObjectId) : Promise<BookingSeries>',
      '+ getPendingSeries(renterId: ObjectId) : Promise<BookingSeries[]>'
    ]
  },
  {
    id: 'Payment',
    name: 'Payment',
    stereotype: 'Feature Schema',
    collection: 'payments',
    desc: 'Financial transaction settlement record storing Stripe checkout session, payment intent tokens, amount, and currency.',
    x: 1610, y: 1100, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ bookingId : ObjectId [FK -> Booking]',
      '+ renterId : ObjectId [FK -> User]',
      '+ stripeSessionId : String',
      '+ stripePaymentIntentId : String',
      '+ amount : Number',
      '+ currency : String ["USD"]',
      '+ method : String ["card"]',
      '+ transactionRef : String',
      '+ paidAt : Date',
      '+ status : "paid" | "pending" | "failed"'
    ],
    methods: [
      '+ createCheckoutSession(bookingId: ObjectId) : Promise<Session>',
      '+ verifySession(sessionId: String) : Promise<Payment>',
      '+ createBulkCheckout(seriesId: ObjectId) : Promise<Session>',
      '+ verifyBulkSession(sessionId: String) : Promise<Payment[]>'
    ]
  },
  {
    id: 'Review',
    name: 'Review',
    stereotype: 'Feature Schema',
    collection: 'reviews',
    desc: 'Post-completion quality evaluation with 0.25-precision star ratings (0.00-5.00), written feedback, and owner response.',
    x: 1610, y: 1500, w: 350,
    attributes: [
      '- _id : ObjectId',
      '+ bookingId : ObjectId [FK -> Booking]',
      '+ renterId : ObjectId [FK -> User]',
      '+ rating : Number [0.0..5.0, step 0.25]',
      '+ comment : String',
      '+ ownerResponse : String',
      '+ createdAt : Date'
    ],
    methods: [
      '+ createReview(data: Object) : Promise<Review>',
      '+ getReviewsByBooking(bookingId: ObjectId) : Promise<Review>',
      '+ replyReview(reviewId: ObjectId, reply: String) : Promise<Review>'
    ]
  },

  // ── COLUMN 5 (x: 2120, w: 340) ─────────────────────────────────────────────
  {
    id: 'Subscription',
    name: 'Subscription',
    stereotype: 'Feature Schema',
    collection: 'subscriptions',
    desc: 'Recurring monthly parking hour allotment plans (Basic 20h, Pro 50h, Premium 100h) integrated with Stripe subscriptions.',
    x: 2120, y: 80, w: 340,
    attributes: [
      '- _id : ObjectId',
      '+ renterId : ObjectId [FK -> User]',
      '+ planId : "basic" | "pro" | "premium"',
      '+ planName : String',
      '+ stripeCustomerId : String',
      '+ stripeSubscriptionId : String',
      '+ status : "active" | "cancelled"',
      '+ hoursTotal : Number',
      '+ hoursUsed : Number',
      '+ currentPeriodEnd : Date',
      '+ createdAt : Date'
    ],
    methods: [
      '+ subscribe(planId: String) : Promise<Session>',
      '+ verifySubscription(sessionId: String) : Promise<Subscription>',
      '+ cancelSubscription(subId: ObjectId) : Promise<Boolean>',
      '+ deductHours(subId: ObjectId, hours: Number) : Promise<Boolean>'
    ]
  },
  {
    id: 'Invoice',
    name: 'Invoice',
    stereotype: 'Feature Schema',
    collection: 'invoices',
    desc: 'Official serialized fiscal invoice document (e.g. INV-2026-0001) linked to booking and payment records.',
    x: 2120, y: 1100, w: 340,
    attributes: [
      '- _id : ObjectId',
      '+ invoiceNumber : String',
      '+ bookingId : ObjectId [FK -> Booking]',
      '+ renterId : ObjectId [FK -> User]',
      '+ paymentId : ObjectId [FK -> Payment]',
      '+ createdAt : Date'
    ],
    methods: [
      '+ generateInvoice(bookingId: ObjectId, paymentId: ObjectId) : Promise<Invoice>',
      '+ getInvoiceById(id: ObjectId) : Promise<Invoice>',
      '+ exportInvoicePDF(id: ObjectId) : Promise<Buffer>',
      '+ nextInvoiceNumber() : Promise<String>'
    ]
  }
];

// Layout heights
const LINE_HEIGHT = 17;
const HEADER_HEIGHT = 46;
const PADDING = 12;

classes.forEach(c => {
  const attrHeight = c.attributes.length * LINE_HEIGHT + PADDING * 2;
  const methHeight = c.methods.length * LINE_HEIGHT + PADDING * 2;
  c.headerHeight = HEADER_HEIGHT;
  c.attrHeight = attrHeight;
  c.methHeight = methHeight;
  c.h = HEADER_HEIGHT + attrHeight + methHeight;
  c.attrDividerY = c.y + HEADER_HEIGHT;
  c.methDividerY = c.y + HEADER_HEIGHT + attrHeight;
});

const classMap = {};
classes.forEach(c => { classMap[c.id] = c; });

// ── 20 RELATIONSHIPS WITH DEDICATED HIGHWAYS & ZERO OVERLAPS ─────────────────
const relationships = [
  // 1. User -> Vehicle (Col 3 -> Col 4 horizontal)
  {
    id: 'rel-user-vehicle',
    from: 'User',
    to: 'Vehicle',
    type: 'association',
    multFrom: '1',
    multTo: '0..*',
    label: 'owns',
    path: `M ${classMap['User'].x + classMap['User'].w} ${classMap['User'].y + 160} L ${classMap['Vehicle'].x} ${classMap['Vehicle'].y + 160}`,
    labelPos: { x: (classMap['User'].x + classMap['User'].w + classMap['Vehicle'].x) / 2, y: classMap['User'].y + 150 },
    multFromPos: { x: classMap['User'].x + classMap['User'].w + 18, y: classMap['User'].y + 150 },
    multToPos: { x: classMap['Vehicle'].x - 22, y: classMap['Vehicle'].y + 150 }
  },
  // 2. User -> Subscription (Col 3 -> Col 5 via top highway y: 25)
  {
    id: 'rel-user-subscription',
    from: 'User',
    to: 'Subscription',
    type: 'association',
    multFrom: '1',
    multTo: '0..1',
    label: 'subscribes to',
    path: `M ${classMap['User'].x + classMap['User'].w - 40} ${classMap['User'].y} L ${classMap['User'].x + classMap['User'].w - 40} 25 L ${classMap['Subscription'].x + 100} 25 L ${classMap['Subscription'].x + 100} ${classMap['Subscription'].y}`,
    labelPos: { x: 1780, y: 18 },
    multFromPos: { x: classMap['User'].x + classMap['User'].w - 20, y: classMap['User'].y - 12 },
    multToPos: { x: classMap['Subscription'].x + 122, y: classMap['Subscription'].y - 12 }
  },
  // 3. User -> Notification (Col 3 -> Col 2 horizontal)
  {
    id: 'rel-user-notification',
    from: 'User',
    to: 'Notification',
    type: 'association',
    multFrom: '1',
    multTo: '0..*',
    label: 'receives',
    path: `M ${classMap['User'].x} ${classMap['User'].y + 160} L ${classMap['Notification'].x + classMap['Notification'].w} ${classMap['Notification'].y + 160}`,
    labelPos: { x: (classMap['User'].x + classMap['Notification'].x + classMap['Notification'].w) / 2, y: classMap['User'].y + 150 },
    multFromPos: { x: classMap['User'].x - 18, y: classMap['User'].y + 150 },
    multToPos: { x: classMap['Notification'].x + classMap['Notification'].w + 22, y: classMap['Notification'].y + 150 }
  },
  // 4. User -> Report (Col 3 -> Col 1 via top highway y: 25)
  {
    id: 'rel-user-report',
    from: 'User',
    to: 'Report',
    type: 'association',
    multFrom: '1',
    multTo: '0..*',
    label: 'generates',
    path: `M ${classMap['User'].x + 40} ${classMap['User'].y} L ${classMap['User'].x + 40} 25 L ${classMap['Report'].x + 200} 25 L ${classMap['Report'].x + 200} ${classMap['Report'].y}`,
    labelPos: { x: 600, y: 18 },
    multFromPos: { x: classMap['User'].x + 60, y: classMap['User'].y - 12 },
    multToPos: { x: classMap['Report'].x + 222, y: classMap['Report'].y - 12 }
  },
  // 5. User -> Building (Col 3 -> Col 1 via highway y: 480)
  {
    id: 'rel-user-building',
    from: 'User',
    to: 'Building',
    type: 'association',
    multFrom: '1',
    multTo: '0..*',
    label: 'owns / manages',
    path: `M ${classMap['User'].x + 60} ${classMap['User'].y + classMap['User'].h} L ${classMap['User'].x + 60} 480 L ${classMap['Building'].x + classMap['Building'].w - 40} 480 L ${classMap['Building'].x + classMap['Building'].w - 40} ${classMap['Building'].y}`,
    labelPos: { x: 740, y: 470 },
    multFromPos: { x: classMap['User'].x + 78, y: classMap['User'].y + classMap['User'].h + 16 },
    multToPos: { x: classMap['Building'].x + classMap['Building'].w - 20, y: classMap['Building'].y - 10 }
  },
  // 6. Building -> Slot (Col 1 -> Col 2 horizontal)
  {
    id: 'rel-building-slot',
    from: 'Building',
    to: 'Slot',
    type: 'composition',
    multFrom: '1',
    multTo: '1..*',
    label: 'contains',
    path: `M ${classMap['Building'].x + classMap['Building'].w} ${classMap['Building'].y + 130} L ${classMap['Slot'].x} ${classMap['Slot'].y + 130}`,
    labelPos: { x: (classMap['Building'].x + classMap['Building'].w + classMap['Slot'].x) / 2, y: classMap['Building'].y + 120 },
    multFromPos: { x: classMap['Building'].x + classMap['Building'].w + 26, y: classMap['Building'].y + 120 },
    multToPos: { x: classMap['Slot'].x - 22, y: classMap['Slot'].y + 120 }
  },
  // 7. Slot -> SlotBlackout (Col 2 -> Col 1 via highway y: 980)
  {
    id: 'rel-slot-blackout',
    from: 'Slot',
    to: 'SlotBlackout',
    type: 'composition',
    multFrom: '1',
    multTo: '0..*',
    label: 'has blackout',
    path: `M ${classMap['Slot'].x + 60} ${classMap['Slot'].y + classMap['Slot'].h} L ${classMap['Slot'].x + 60} 980 L ${classMap['SlotBlackout'].x + classMap['SlotBlackout'].w - 40} 980 L ${classMap['SlotBlackout'].x + classMap['SlotBlackout'].w - 40} ${classMap['SlotBlackout'].y}`,
    labelPos: { x: 450, y: 970 },
    multFromPos: { x: classMap['Slot'].x + 80, y: classMap['Slot'].y + classMap['Slot'].h + 18 },
    multToPos: { x: classMap['SlotBlackout'].x + classMap['SlotBlackout'].w - 20, y: classMap['SlotBlackout'].y - 10 }
  },
  // 8. Slot -> PricingRule (Col 2 direct vertical)
  {
    id: 'rel-slot-pricingrule',
    from: 'Slot',
    to: 'PricingRule',
    type: 'association',
    multFrom: '1..*',
    multTo: '0..*',
    label: 'priced by',
    path: `M ${classMap['Slot'].x + 220} ${classMap['Slot'].y + classMap['Slot'].h} L ${classMap['PricingRule'].x + 220} ${classMap['PricingRule'].y}`,
    labelPos: { x: classMap['Slot'].x + 275, y: (classMap['Slot'].y + classMap['Slot'].h + classMap['PricingRule'].y) / 2 },
    multFromPos: { x: classMap['Slot'].x + 242, y: classMap['Slot'].y + classMap['Slot'].h + 18 },
    multToPos: { x: classMap['PricingRule'].x + 242, y: classMap['PricingRule'].y - 10 }
  },
  // 9. Building -> PricingRule (Col 1 -> Col 2 via highway y: 950)
  {
    id: 'rel-building-pricingrule',
    from: 'Building',
    to: 'PricingRule',
    type: 'association',
    multFrom: '0..1',
    multTo: '0..*',
    label: 'scoped to',
    path: `M ${classMap['Building'].x + 240} ${classMap['Building'].y + classMap['Building'].h} L ${classMap['Building'].x + 240} 950 L ${classMap['PricingRule'].x} 950 L ${classMap['PricingRule'].x} ${classMap['PricingRule'].y + 80}`,
    labelPos: { x: 380, y: 940 },
    multFromPos: { x: classMap['Building'].x + 260, y: classMap['Building'].y + classMap['Building'].h + 18 },
    multToPos: { x: classMap['PricingRule'].x - 22, y: classMap['PricingRule'].y + 70 }
  },
  // 10. Slot -> Booking (Col 2 -> Col 3 horizontal)
  {
    id: 'rel-slot-booking',
    from: 'Slot',
    to: 'Booking',
    type: 'association',
    multFrom: '1',
    multTo: '0..*',
    label: 'is booked for',
    path: `M ${classMap['Slot'].x + classMap['Slot'].w} ${classMap['Slot'].y + 130} L ${classMap['Booking'].x} ${classMap['Booking'].y + 130}`,
    labelPos: { x: (classMap['Slot'].x + classMap['Slot'].w + classMap['Booking'].x) / 2, y: classMap['Slot'].y + 120 },
    multFromPos: { x: classMap['Slot'].x + classMap['Slot'].w + 20, y: classMap['Slot'].y + 120 },
    multToPos: { x: classMap['Booking'].x - 22, y: classMap['Booking'].y + 120 }
  },
  // 11. User -> Booking (Col 3 direct vertical)
  {
    id: 'rel-user-booking',
    from: 'User',
    to: 'Booking',
    type: 'association',
    multFrom: '1',
    multTo: '0..*',
    label: 'reserves',
    path: `M ${classMap['User'].x + 200} ${classMap['User'].y + classMap['User'].h} L ${classMap['Booking'].x + 200} ${classMap['Booking'].y}`,
    labelPos: { x: classMap['User'].x + 250, y: (classMap['User'].y + classMap['User'].h + classMap['Booking'].y) / 2 },
    multFromPos: { x: classMap['User'].x + 220, y: classMap['User'].y + classMap['User'].h + 18 },
    multToPos: { x: classMap['Booking'].x + 220, y: classMap['Booking'].y - 10 }
  },
  // 12. Vehicle -> Booking (Col 4 -> Col 3 via highway y: 480)
  {
    id: 'rel-vehicle-booking',
    from: 'Vehicle',
    to: 'Booking',
    type: 'association',
    multFrom: '0..1',
    multTo: '0..*',
    label: 'parked in',
    path: `M ${classMap['Vehicle'].x + 60} ${classMap['Vehicle'].y + classMap['Vehicle'].h} L ${classMap['Vehicle'].x + 60} 480 L ${classMap['Booking'].x + classMap['Booking'].w - 40} 480 L ${classMap['Booking'].x + classMap['Booking'].w - 40} ${classMap['Booking'].y}`,
    labelPos: { x: 1530, y: 470 },
    multFromPos: { x: classMap['Vehicle'].x + 80, y: classMap['Vehicle'].y + classMap['Vehicle'].h + 18 },
    multToPos: { x: classMap['Booking'].x + classMap['Booking'].w - 20, y: classMap['Booking'].y - 10 }
  },
  // 13. BookingSeries -> Booking (Col 4 -> Col 3 horizontal)
  {
    id: 'rel-bookingseries-booking',
    from: 'BookingSeries',
    to: 'Booking',
    type: 'composition',
    multFrom: '1',
    multTo: '1..*',
    label: 'generates',
    path: `M ${classMap['BookingSeries'].x} ${classMap['BookingSeries'].y + 130} L ${classMap['Booking'].x + classMap['Booking'].w} ${classMap['Booking'].y + 130}`,
    labelPos: { x: (classMap['BookingSeries'].x + classMap['Booking'].x + classMap['Booking'].w) / 2, y: classMap['BookingSeries'].y + 120 },
    multFromPos: { x: classMap['BookingSeries'].x - 26, y: classMap['BookingSeries'].y + 120 },
    multToPos: { x: classMap['Booking'].x + classMap['Booking'].w + 20, y: classMap['Booking'].y + 120 }
  },
  // 14. Booking -> CheckInOut (Col 3 direct vertical)
  {
    id: 'rel-booking-checkinout',
    from: 'Booking',
    to: 'CheckInOut',
    type: 'association',
    multFrom: '1',
    multTo: '0..1',
    label: 'tracks presence',
    path: `M ${classMap['Booking'].x + 130} ${classMap['Booking'].y + classMap['Booking'].h} L ${classMap['CheckInOut'].x + 130} ${classMap['CheckInOut'].y}`,
    labelPos: { x: classMap['Booking'].x + 200, y: (classMap['Booking'].y + classMap['Booking'].h + classMap['CheckInOut'].y) / 2 },
    multFromPos: { x: classMap['Booking'].x + 150, y: classMap['Booking'].y + classMap['Booking'].h + 18 },
    multToPos: { x: classMap['CheckInOut'].x + 150, y: classMap['CheckInOut'].y - 10 }
  },
  // 15. CheckInOut -> OverstayPenalty (Col 3 direct vertical)
  {
    id: 'rel-checkinout-overstay',
    from: 'CheckInOut',
    to: 'OverstayPenalty',
    type: 'association',
    multFrom: '1',
    multTo: '0..1',
    label: 'incurs on breach',
    path: `M ${classMap['CheckInOut'].x + 220} ${classMap['CheckInOut'].y + classMap['CheckInOut'].h} L ${classMap['OverstayPenalty'].x + 220} ${classMap['OverstayPenalty'].y}`,
    labelPos: { x: classMap['CheckInOut'].x + 295, y: (classMap['CheckInOut'].y + classMap['CheckInOut'].h + classMap['OverstayPenalty'].y) / 2 },
    multFromPos: { x: classMap['CheckInOut'].x + 242, y: classMap['CheckInOut'].y + classMap['CheckInOut'].h + 18 },
    multToPos: { x: classMap['OverstayPenalty'].x + 242, y: classMap['OverstayPenalty'].y - 10 }
  },
  // 16. Booking -> Payment (Col 3 -> Col 4 via highway y: 1010)
  {
    id: 'rel-booking-payment',
    from: 'Booking',
    to: 'Payment',
    type: 'association',
    multFrom: '1',
    multTo: '0..1',
    label: 'settled by',
    path: `M ${classMap['Booking'].x + classMap['Booking'].w - 60} ${classMap['Booking'].y + classMap['Booking'].h} L ${classMap['Booking'].x + classMap['Booking'].w - 60} 1010 L ${classMap['Payment'].x + 60} 1010 L ${classMap['Payment'].x + 60} ${classMap['Payment'].y}`,
    labelPos: { x: 1510, y: 1000 },
    multFromPos: { x: classMap['Booking'].x + classMap['Booking'].w - 40, y: classMap['Booking'].y + classMap['Booking'].h + 18 },
    multToPos: { x: classMap['Payment'].x + 80, y: classMap['Payment'].y - 10 }
  },
  // 17. Payment -> Invoice (Col 4 -> Col 5 horizontal)
  {
    id: 'rel-payment-invoice',
    from: 'Payment',
    to: 'Invoice',
    type: 'association',
    multFrom: '0..1',
    multTo: '0..1',
    label: 'issues',
    path: `M ${classMap['Payment'].x + classMap['Payment'].w} ${classMap['Payment'].y + 120} L ${classMap['Invoice'].x} ${classMap['Invoice'].y + 120}`,
    labelPos: { x: (classMap['Payment'].x + classMap['Payment'].w + classMap['Invoice'].x) / 2, y: classMap['Payment'].y + 110 },
    multFromPos: { x: classMap['Payment'].x + classMap['Payment'].w + 18, y: classMap['Payment'].y + 110 },
    multToPos: { x: classMap['Invoice'].x - 22, y: classMap['Invoice'].y + 110 }
  },
  // 18. Booking -> Invoice (Col 3 -> Col 5 via highway y: 1040)
  {
    id: 'rel-booking-invoice',
    from: 'Booking',
    to: 'Invoice',
    type: 'association',
    multFrom: '1',
    multTo: '0..1',
    label: 'billed as',
    path: `M ${classMap['Booking'].x + classMap['Booking'].w} ${classMap['Booking'].y + 260} L 1530 ${classMap['Booking'].y + 260} L 1530 1040 L ${classMap['Invoice'].x + 120} 1040 L ${classMap['Invoice'].x + 120} ${classMap['Invoice'].y}`,
    labelPos: { x: 2010, y: 1030 },
    multFromPos: { x: classMap['Booking'].x + classMap['Booking'].w + 18, y: classMap['Booking'].y + 250 },
    multToPos: { x: classMap['Invoice'].x + 140, y: classMap['Invoice'].y - 10 }
  },
  // 19. Booking -> Review (Col 3 -> Col 4 via corridor x: 1510)
  {
    id: 'rel-booking-review',
    from: 'Booking',
    to: 'Review',
    type: 'association',
    multFrom: '1',
    multTo: '0..1',
    label: 'reviewed via',
    path: `M ${classMap['Booking'].x + classMap['Booking'].w - 20} ${classMap['Booking'].y + classMap['Booking'].h} L ${classMap['Booking'].x + classMap['Booking'].w - 20} 1025 L 1510 1025 L 1510 1560 L ${classMap['Review'].x} 1560`,
    labelPos: { x: 1475, y: 1350 },
    multFromPos: { x: classMap['Booking'].x + classMap['Booking'].w - 2, y: classMap['Booking'].y + classMap['Booking'].h + 18 },
    multToPos: { x: classMap['Review'].x - 22, y: 1550 }
  },
  // 20. Building -> Report (Col 1 direct vertical)
  {
    id: 'rel-building-report',
    from: 'Building',
    to: 'Report',
    type: 'association',
    multFrom: '0..1',
    multTo: '0..*',
    label: 'filtered by',
    path: `M ${classMap['Building'].x + 200} ${classMap['Building'].y} L ${classMap['Report'].x + 200} ${classMap['Report'].y + classMap['Report'].h}`,
    labelPos: { x: classMap['Building'].x + 250, y: (classMap['Building'].y + classMap['Report'].y + classMap['Report'].h) / 2 },
    multFromPos: { x: classMap['Building'].x + 222, y: classMap['Building'].y - 10 },
    multToPos: { x: classMap['Report'].x + 222, y: classMap['Report'].y + classMap['Report'].h + 18 }
  }
];

let svgClasses = '';
classes.forEach(c => {
  let attrsText = '';
  c.attributes.forEach((attr, i) => {
    const yPos = c.attrDividerY + PADDING + 12 + i * LINE_HEIGHT;
    const isPrivate = attr.startsWith('-');
    const color = isPrivate ? '#b91c1c' : '#1e293b';
    attrsText += `<text x="${c.x + PADDING}" y="${yPos}" fill="${color}" font-family="Consolas, 'Courier New', monospace" font-size="11.5px">${escapeXml(attr)}</text>\n`;
  });

  let methsText = '';
  c.methods.forEach((meth, i) => {
    const yPos = c.methDividerY + PADDING + 12 + i * LINE_HEIGHT;
    methsText += `<text x="${c.x + PADDING}" y="${yPos}" fill="#0f172a" font-family="Consolas, 'Courier New', monospace" font-size="11.5px">${escapeXml(meth)}</text>\n`;
  });

  svgClasses += `
    <g class="uml-class-node" id="node-${c.id}" data-id="${c.id}" onclick="inspectClass('${c.id}')" style="cursor: pointer;">
      <!-- Outer Box -->
      <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" rx="2" ry="2" 
            fill="#ffffff" stroke="#1e293b" stroke-width="1.6" class="class-bg" />
      
      <!-- Header Background -->
      <rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.headerHeight}" rx="2" ry="2" 
            fill="#f8fafc" stroke="none" />
      <line x1="${c.x}" y1="${c.attrDividerY}" x2="${c.x + c.w}" y2="${c.attrDividerY}" stroke="#1e293b" stroke-width="1.6" />
      
      <!-- Header Stereotype & Name -->
      <text x="${c.x + c.w / 2}" y="${c.y + 17}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-style="italic" font-size="10.5px" fill="#64748b">&lt;&lt;${c.stereotype}&gt;&gt;</text>
      <text x="${c.x + c.w / 2}" y="${c.y + 36}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-weight="700" font-size="15px" fill="#0f172a">${c.name}</text>
      
      <!-- Attributes Section -->
      ${attrsText}
      
      <!-- Divider -->
      <line x1="${c.x}" y1="${c.methDividerY}" x2="${c.x + c.w}" y2="${c.methDividerY}" stroke="#1e293b" stroke-width="1.6" />
      
      <!-- Methods Section -->
      ${methsText}
    </g>
  `;
});

let svgRels = '';
relationships.forEach(r => {
  const isComp = r.type === 'composition';
  const startMarker = isComp ? 'url(#marker-comp-start)' : '';
  
  // Calculate badge width based on label text length
  const labelWidth = Math.max(76, r.label.length * 7.5 + 16);
  const halfW = labelWidth / 2;

  svgRels += `
    <g class="uml-rel-group" id="relgroup-${r.id}" data-rel="${r.id}" data-from="${r.from}" data-to="${r.to}">
      <!-- Path line -->
      <path d="${r.path}" fill="none" stroke="#334155" stroke-width="1.6" 
            marker-start="${startMarker}" class="rel-line" />
      
      <!-- Association Label Badge (Solid white background prevents any line overlap) -->
      <g transform="translate(${r.labelPos.x}, ${r.labelPos.y})">
        <rect x="-${halfW}" y="-10" width="${labelWidth}" height="19" rx="3" ry="3" fill="#ffffff" stroke="#94a3b8" stroke-width="0.9" />
        <text x="0" y="3.5" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="10.5px" fill="#1e293b" font-weight="600">${escapeXml(r.label)}</text>
      </g>
      
      <!-- Multiplicity From -->
      <g transform="translate(${r.multFromPos.x}, ${r.multFromPos.y})">
        <rect x="-11" y="-8" width="22" height="16" fill="#ffffff" rx="2" ry="2" stroke="#e2e8f0" stroke-width="0.6" />
        <text x="0" y="3.5" text-anchor="middle" font-family="Consolas, monospace" font-size="10.5px" font-weight="700" fill="#0f172a">${r.multFrom}</text>
      </g>
      
      <!-- Multiplicity To -->
      <g transform="translate(${r.multToPos.x}, ${r.multToPos.y})">
        <rect x="-13" y="-8" width="26" height="16" fill="#ffffff" rx="2" ry="2" stroke="#e2e8f0" stroke-width="0.6" />
        <text x="0" y="3.5" text-anchor="middle" font-family="Consolas, monospace" font-size="10.5px" font-weight="700" fill="#0f172a">${r.multTo}</text>
      </g>
    </g>
  `;
});

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

let dictRows = '';
classes.forEach(c => {
  const pk = '_id (ObjectId)';
  const fks = c.attributes.filter(a => a.includes('[FK ->')).map(a => a.split(':')[0].replace(/^[+-]\s*/, '').trim()).join(', ') || 'None';
  dictRows += `
    <tr id="dict-row-${c.id}" onclick="jumpToClass('${c.id}')" style="cursor: pointer;">
      <td><strong style="color: #0284c7;">${c.name}</strong></td>
      <td><code>${c.collection}</code></td>
      <td>${c.stereotype}</td>
      <td><code>${pk}</code></td>
      <td><code>${fks}</code></td>
      <td>${c.desc}</td>
    </tr>
  `;
});

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ZENO — Classic UML Class Diagram</title>
  <style>
    /* ── RESET & BASE ─────────────────────────────────────────────────── */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html {
      scroll-behavior: smooth;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      color: #0f172a;
      line-height: 1.5;
    }

    /* ── HEADER & TOOLBAR ─────────────────────────────────────────────── */
    header {
      background: #ffffff;
      border-bottom: 1px solid #cbd5e1;
      padding: 12px 24px;
      position: sticky;
      top: 0;
      z-index: 100;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    .brand-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 7px;
      background: #e2e8f0;
      color: #475569;
      border-radius: 4px;
      letter-spacing: 0.03em;
    }
    .brand-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .nav-links {
      display: flex;
      gap: 4px;
      margin-right: 8px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #1e293b;
      padding: 6px 11px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.15s ease, border-color 0.15s ease;
      user-select: none;
    }
    .btn:hover {
      background: #f8fafc;
      border-color: #94a3b8;
    }
    .btn.active {
      background: #e2e8f0;
      border-color: #94a3b8;
    }
    .btn-primary {
      background: #0f172a;
      border-color: #0f172a;
      color: #ffffff;
    }
    .btn-primary:hover {
      background: #1e293b;
      border-color: #1e293b;
    }
    .search-box {
      position: relative;
    }
    .search-input {
      border: 1px solid #cbd5e1;
      padding: 6px 10px 6px 28px;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
      width: 180px;
      transition: width 0.2s ease, border-color 0.2s ease;
    }
    .search-input:focus {
      border-color: #0f172a;
      width: 230px;
    }
    .search-icon {
      position: absolute;
      left: 8px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      color: #64748b;
      pointer-events: none;
    }

    /* ── DIAGRAM VIEWPORT CONTAINER ───────────────────────────────────── */
    #canvas-container {
      position: relative;
      width: 100%;
      height: 870px;
      background: #ffffff;
      border-bottom: 1px solid #cbd5e1;
      overflow: hidden;
      cursor: grab;
    }
    #canvas-container:active {
      cursor: grabbing;
    }
    svg#diagram-svg {
      width: 100%;
      height: 100%;
      display: block;
      transform-origin: 0 0;
    }

    /* UML SVG Interactive Styling */
    .uml-class-node {
      transition: filter 0.15s ease;
    }
    .uml-class-node:hover .class-bg {
      stroke: #0284c7 !important;
      stroke-width: 2.2 !important;
    }
    .uml-class-node.selected .class-bg {
      stroke: #2563eb !important;
      stroke-width: 2.5 !important;
      fill: #f0f9ff !important;
    }
    .uml-rel-group.highlight .rel-line {
      stroke: #0284c7 !important;
      stroke-width: 2.4 !important;
    }
    .uml-rel-group.faded {
      opacity: 0.18;
    }
    .uml-class-node.faded {
      opacity: 0.22;
    }

    /* ── FLOATING LEGEND ──────────────────────────────────────────────── */
    #legend-card {
      position: absolute;
      bottom: 18px;
      left: 22px;
      background: rgba(255, 255, 255, 0.96);
      backdrop-filter: blur(4px);
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 14px;
      font-size: 11.5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
      z-index: 50;
      max-width: 400px;
      pointer-events: auto;
    }
    .legend-title {
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .legend-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px 14px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #334155;
    }
    .legend-symbol {
      font-family: Consolas, monospace;
      font-weight: bold;
      font-size: 12.5px;
      color: #0f172a;
      display: inline-block;
      min-width: 18px;
      text-align: center;
    }

    /* ── SIDE DRAWER INSPECTOR ────────────────────────────────────────── */
    #inspector {
      position: fixed;
      top: 60px;
      right: -440px;
      width: 420px;
      height: calc(100vh - 60px);
      background: #ffffff;
      border-left: 1px solid #cbd5e1;
      box-shadow: -4px 0 20px rgba(0,0,0,0.08);
      z-index: 90;
      transition: right 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
    }
    #inspector.open {
      right: 0;
    }
    .inspector-header {
      padding: 16px 20px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;
    }
    .inspector-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
    }
    .inspector-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #64748b;
    }
    .inspector-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }
    .inspector-sec-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin: 14px 0 6px 0;
    }
    .field-list {
      list-style: none;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 8px 12px;
      font-family: Consolas, monospace;
      font-size: 11.5px;
    }
    .field-list li {
      padding: 3px 0;
      border-bottom: 1px solid #edf2f7;
    }
    .field-list li:last-child {
      border-bottom: none;
    }

    /* ── DATA DICTIONARY SECTION ──────────────────────────────────────── */
    .section-container {
      max-width: 1440px;
      margin: 40px auto 80px auto;
      padding: 0 24px;
    }
    .section-header {
      margin-bottom: 18px;
    }
    .section-header h2 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-header p {
      font-size: 13.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .dict-table-wrap {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow-x: auto;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    table.dict-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 12.5px;
    }
    table.dict-table th {
      background: #f8fafc;
      color: #334155;
      font-weight: 700;
      padding: 10px 14px;
      border-bottom: 1px solid #cbd5e1;
      border-right: 1px solid #e2e8f0;
    }
    table.dict-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #f1f5f9;
      color: #1e293b;
      vertical-align: top;
    }
    table.dict-table tr:hover td {
      background: #f0f9ff;
    }
    table.dict-table code {
      font-family: Consolas, monospace;
      font-size: 11.5px;
      background: #f1f5f9;
      padding: 1px 5px;
      border-radius: 3px;
      color: #0f172a;
    }

    /* ── PRINT MEDIA SPECIFICATION ────────────────────────────────────── */
    @media print {
      header, .toolbar, #legend-card, #inspector, .search-box {
        display: none !important;
      }
      body, #canvas-container {
        background: #ffffff !important;
        height: auto !important;
        overflow: visible !important;
        border: none !important;
      }
      svg#diagram-svg {
        width: 100% !important;
        height: auto !important;
        transform: none !important;
      }
      @page {
        size: A3 landscape;
        margin: 1cm;
      }
      .section-container {
        page-break-before: always;
        margin-top: 20px;
      }
    }
  </style>
</head>
<body>

  <!-- HEADER & TOOLBAR -->
  <header>
    <div>
      <div class="brand-title">
        <span>ZENO Domain Entity Class Diagram</span>
        <span class="badge">UML 2.5 Standard</span>
        <span class="badge" style="background:#dbeafe; color:#1e40af;">16 Classes • 20 Associations</span>
      </div>
      <div class="brand-sub">CSE470 Software Engineering | Automated Parking Area Rental & Facility Management System</div>
    </div>
    <div class="toolbar">
      <div class="nav-links">
        <a href="#canvas-container" class="btn active">📊 Diagram</a>
        <a href="#data-dictionary" class="btn">📋 Data Dictionary</a>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="class-search" class="search-input" placeholder="Find Class (e.g. Booking)..." oninput="handleSearch(this.value)">
      </div>
      <button class="btn" onclick="zoomIn()" title="Zoom In">➕</button>
      <button class="btn" onclick="zoomOut()" title="Zoom Out">➖</button>
      <button class="btn" onclick="resetZoom()" title="Reset (100%)">↺ Reset</button>
      <button class="btn" onclick="fitToScreen()" title="Fit to Screen">⛶ Fit</button>
      <button class="btn" onclick="exportSvg()" title="Download raw SVG file">⬇️ SVG</button>
      <button class="btn btn-primary" onclick="window.print()" title="Print or Save to PDF">🖨️ Print / PDF</button>
    </div>
  </header>

  <!-- SVG DIAGRAM CANVAS -->
  <div id="canvas-container">
    <svg id="diagram-svg" viewBox="0 0 2520 1800">
      <defs>
        <!-- Marker for Composition (Filled Black Diamond) -->
        <marker id="marker-comp-start" viewBox="0 0 16 10" refX="0" refY="5" markerWidth="14" markerHeight="9" orient="auto">
          <polygon points="0,5 7,1 14,5 7,9" fill="#1e293b" stroke="#1e293b" stroke-width="1" />
        </marker>
        <!-- Marker for Directed Arrow -->
        <marker id="marker-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#1e293b" />
        </marker>
      </defs>

      <!-- Background Subtle Grid Pattern -->
      <g id="viewport-group">
        <!-- Relationship Lines Layer (Rendered below class nodes) -->
        <g id="layer-relationships">
          ${svgRels}
        </g>

        <!-- UML Class Nodes Layer -->
        <g id="layer-classes">
          ${svgClasses}
        </g>
      </g>
    </svg>

    <!-- FLOATING UML NOTATION LEGEND -->
    <div id="legend-card">
      <div class="legend-title">
        <span>UML Standard Notation Guide</span>
        <span style="font-size: 10.5px; color: #64748b; font-weight: normal;">Click any class to inspect</span>
      </div>
      <div class="legend-grid">
        <div class="legend-item"><span class="legend-symbol">◆──</span> Composition (strong ownership)</div>
        <div class="legend-item"><span class="legend-symbol">───</span> Bidirectional Association</div>
        <div class="legend-item"><span class="legend-symbol">+</span> Public Member</div>
        <div class="legend-item"><span class="legend-symbol">-</span> Private Member</div>
        <div class="legend-item"><span class="legend-symbol">1</span> Exactly one multiplicity</div>
        <div class="legend-item"><span class="legend-symbol">0..*</span> Zero or more multiplicity</div>
      </div>
    </div>
  </div>

  <!-- CLASS INSPECTOR DRAWER -->
  <div id="inspector">
    <div class="inspector-header">
      <div>
        <div id="insp-name" class="inspector-title">User</div>
        <div id="insp-stereo" style="font-size: 11px; color: #64748b; font-style: italic;">&lt;&lt;Mongoose Model&gt;&gt;</div>
      </div>
      <button class="inspector-close" onclick="closeInspector()">✕</button>
    </div>
    <div class="inspector-body">
      <div class="inspector-sec-title">Description & Responsibility</div>
      <p id="insp-desc" style="font-size: 12.5px; color: #334155; line-height: 1.5;"></p>

      <div class="inspector-sec-title">MongoDB Collection</div>
      <code id="insp-coll" style="font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px;"></code>

      <div class="inspector-sec-title">Attributes / Schema Fields</div>
      <ul id="insp-attrs" class="field-list"></ul>

      <div class="inspector-sec-title">Operations / Controller Methods</div>
      <ul id="insp-meths" class="field-list"></ul>
    </div>
  </div>

  <!-- DATA DICTIONARY SECTION -->
  <div class="section-container" id="data-dictionary">
    <div class="section-header">
      <h2>Project Entity Data Dictionary</h2>
      <p>Complete structural reference of all 16 persistent data models and schemas within the ZENO parking ecosystem. Click any row to jump and highlight in diagram.</p>
    </div>
    <div class="dict-table-wrap">
      <table class="dict-table">
        <thead>
          <tr>
            <th>Class Name</th>
            <th>Collection / Table</th>
            <th>Stereotype</th>
            <th>Primary Key</th>
            <th>Foreign Keys</th>
            <th>System Responsibility</th>
          </tr>
        </thead>
        <tbody>
          ${dictRows}
        </tbody>
      </table>
    </div>
  </div>

  <!-- INTERACTIVE LOGIC (PAN, ZOOM, INSPECTOR, SEARCH, EXPORT) -->
  <script>
    const svg = document.getElementById('diagram-svg');
    const viewport = document.getElementById('viewport-group');
    const container = document.getElementById('canvas-container');

    let scale = 0.85;
    let pointX = 20;
    let pointY = 10;
    let isPanning = false;
    let startX = 0;
    let startY = 0;

    const classData = ${JSON.stringify(classes)};
    const relData = ${JSON.stringify(relationships)};

    function setTransform() {
      viewport.setAttribute('transform', \`translate(\${pointX}, \${pointY}) scale(\${scale})\`);
    }

    // Pan interactions
    container.addEventListener('mousedown', (e) => {
      if (e.target.closest('.uml-class-node') || e.target.closest('#legend-card')) return;
      isPanning = true;
      startX = e.clientX - pointX;
      startY = e.clientY - pointY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      pointX = e.clientX - startX;
      pointY = e.clientY - startY;
      setTransform();
    });

    window.addEventListener('mouseup', () => {
      isPanning = false;
    });

    // Zoom via wheel
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const xs = (mouseX - pointX) / scale;
      const ys = (mouseY - pointY) / scale;
      const delta = -e.deltaY;
      
      const factor = delta > 0 ? 1.08 : 0.92;
      const newScale = Math.min(Math.max(0.35, scale * factor), 2.2);
      
      pointX = mouseX - xs * newScale;
      pointY = mouseY - ys * newScale;
      scale = newScale;
      setTransform();
    }, { passive: false });

    function zoomIn() {
      scale = Math.min(scale * 1.2, 2.2);
      setTransform();
    }
    function zoomOut() {
      scale = Math.max(scale * 0.8, 0.35);
      setTransform();
    }
    function resetZoom() {
      scale = 0.88;
      pointX = (container.clientWidth - 2520 * scale) / 2;
      pointY = 20;
      setTransform();
    }
    function fitToScreen() {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const svgW = 2520;
      const svgH = 1800;
      scale = Math.min(w / svgW, h / svgH) * 0.96;
      pointX = (w - svgW * scale) / 2;
      pointY = (h - svgH * scale) / 2;
      setTransform();
    }

    // Default view on load
    window.addEventListener('DOMContentLoaded', () => {
      fitToScreen();
    });

    // Class Inspection
    function inspectClass(id) {
      const node = classData.find(c => c.id === id);
      if (!node) return;

      document.querySelectorAll('.uml-class-node').forEach(el => el.classList.remove('selected'));
      document.getElementById('node-' + id)?.classList.add('selected');

      document.getElementById('insp-name').innerText = node.name;
      document.getElementById('insp-stereo').innerText = '<<' + node.stereotype + '>>';
      document.getElementById('insp-desc').innerText = node.desc;
      document.getElementById('insp-coll').innerText = node.collection;

      const attrsEl = document.getElementById('insp-attrs');
      attrsEl.innerHTML = node.attributes.map(a => \`<li>\${escapeHtml(a)}</li>\`).join('');

      const methsEl = document.getElementById('insp-meths');
      methsEl.innerHTML = node.methods.map(m => \`<li>\${escapeHtml(m)}</li>\`).join('');

      document.getElementById('inspector').classList.add('open');

      highlightConnections(id);
    }

    function closeInspector() {
      document.getElementById('inspector').classList.remove('open');
      document.querySelectorAll('.uml-class-node').forEach(el => el.classList.remove('selected', 'faded'));
      document.querySelectorAll('.uml-rel-group').forEach(el => el.classList.remove('highlight', 'faded'));
    }

    function highlightConnections(id) {
      const connectedClasses = new Set([id]);
      document.querySelectorAll('.uml-rel-group').forEach(relEl => {
        const from = relEl.getAttribute('data-from');
        const to = relEl.getAttribute('data-to');
        if (from === id || to === id) {
          relEl.classList.add('highlight');
          relEl.classList.remove('faded');
          connectedClasses.add(from);
          connectedClasses.add(to);
        } else {
          relEl.classList.remove('highlight');
          relEl.classList.add('faded');
        }
      });

      document.querySelectorAll('.uml-class-node').forEach(nodeEl => {
        const nodeId = nodeEl.getAttribute('data-id');
        if (connectedClasses.has(nodeId)) {
          nodeEl.classList.remove('faded');
        } else {
          nodeEl.classList.add('faded');
        }
      });
    }

    function handleSearch(query) {
      const q = query.trim().toLowerCase();
      if (!q) {
        closeInspector();
        return;
      }
      const match = classData.find(c => c.name.toLowerCase().includes(q));
      if (match) {
        inspectClass(match.id);
        centerOnNode(match);
      }
    }

    function centerOnNode(node) {
      const w = container.clientWidth;
      const h = container.clientHeight;
      scale = 1.0;
      pointX = (w / 2) - (node.x + node.w / 2) * scale;
      pointY = (h / 2) - (node.y + node.h / 2) * scale;
      setTransform();
    }

    function jumpToClass(id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const node = classData.find(c => c.id === id);
      if (node) {
        inspectClass(node.id);
        centerOnNode(node);
      }
    }

    function exportSvg() {
      const svgElement = document.getElementById('diagram-svg');
      const serializer = new XMLSerializer();
      let source = serializer.serializeToString(svgElement);
      if(!source.match(/^<svg[^>]+xmlns="http\\:\\/\\/www\\.w3\\.org\\/2000\\/svg"/)){
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zeno-uml-class-diagram.svg';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  </script>
</body>
</html>
`;

const rootPath = path.join(__dirname, '..', 'class-diagram.html');
const docsPath = path.join(__dirname, '..', 'docs', 'class-diagram.html');

fs.writeFileSync(rootPath, htmlContent, 'utf8');
console.log('Successfully wrote:', rootPath);

fs.writeFileSync(docsPath, htmlContent, 'utf8');
console.log('Successfully wrote:', docsPath);
