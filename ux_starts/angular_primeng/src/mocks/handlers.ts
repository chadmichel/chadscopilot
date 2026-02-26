import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';
import {
  StudentDto,
  StudentStatus,
  StudentProgram,
  StudentLevel,
  ClassAssignmentDto,
  TestResultDto,
  StudentNoteDto,
} from '../app/dto/student.dto';
import {
  ClassDto,
  ClassStatus,
  ClassLevel,
  ClassType,
  ClassEnrollmentDto,
  ClassSessionDto,
  AttendanceRecordDto,
  SessionWithAttendance,
} from '../app/dto/class.dto';
import {
  VehicleDto,
  ExamTypeDto,
  LocationDto,
  VolunteerDto,
  VolunteerStatus,
  VolunteerRole,
  DayOfWeek,
  TimeOfDay,
} from '../app/dto/admin.dto';
import {
  QueueItemDto,
  QueueItemStatus,
  QueueItemPriority,
  QueueItemType,
  QueueUserOption,
} from '../app/dto/queue.dto';
import {
  StudentExamSummaryDto,
  ExamRecordDto,
  ExamStatsDto,
  ExamStatus,
} from '../app/dto/exam.dto';
import {
  GoalDto,
  StudentGoalDto,
  GoalPipelineDto,
  GoalLevelDto,
  StudentGoalLevelStatusDto,
} from '../app/dto/goal.dto';
import { AppointmentDto, AppointmentType } from '../app/dto/appointment.dto';

// Mock data generators
const allDaysOfWeek = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
const allTimesOfDay = ['MOR', 'AFT', 'EVE'] as const;

const generateMockUser = (id: string, index: number) => {
  const isTutor = index < 8 || faker.datatype.boolean({ probability: 0.3 });
  const isCoordinator =
    index < 5 || faker.datatype.boolean({ probability: 0.2 });

  // Generate availability for tutors/coordinators
  const numDays = faker.number.int({ min: 2, max: 5 });
  const availability =
    isTutor || isCoordinator
      ? faker.helpers.arrayElements([...allDaysOfWeek], numDays)
      : [];

  const numTimes = faker.number.int({ min: 1, max: 3 });
  const timeOfDay =
    isTutor || isCoordinator
      ? faker.helpers.arrayElements([...allTimesOfDay], numTimes)
      : [];

  return {
    id,
    username: faker.internet.username(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    role: faker.helpers.arrayElement(['admin', 'user', 'manager']),
    title: faker.person.jobTitle(),
    isTutor,
    isCoordinator,
    availability,
    timeOfDay,
    volunteerStatus: isTutor || isCoordinator ? 'Active' : undefined,
    volunteerStartDate:
      isTutor || isCoordinator
        ? faker.date.past({ years: 2 }).toISOString()
        : undefined,
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
  };
};

const generateMockConversation = (id: string) => ({
  id,
  title: faker.lorem.sentence(4),
  status: faker.helpers.arrayElement(['active', 'completed', 'archived']),
  messages: [
    {
      role: 'user',
      content: faker.lorem.sentence(),
      timestamp: faker.date.recent().toISOString(),
    },
    {
      role: 'assistant',
      content: faker.lorem.paragraph(),
      timestamp: faker.date.recent().toISOString(),
      toolsUsed: ['search_contacts'],
    },
  ],
  messageCount: 2,
  lastMessageAt: faker.date.recent().toISOString(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
});

// Generate mock data arrays
const mockUsers = Array.from({ length: 25 }, (_, i) =>
  generateMockUser(`user-${i + 1}`, i),
);

const mockConversations = Array.from({ length: 10 }, (_, i) =>
  generateMockConversation(`conv-${i + 1}`),
);

// Student mock data generators
const programs: StudentProgram[] = ['ELL', 'ADS', 'BOTH'];
const levels: StudentLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const statuses: StudentStatus[] = ['Active', 'Inactive'];
const countries = [
  'Mexico',
  'Vietnam',
  'Sudan',
  'Iraq',
  'Guatemala',
  'El Salvador',
  'Somalia',
  'Myanmar',
  'China',
  'Nepal',
];
const languages = [
  'Spanish',
  'Vietnamese',
  'Arabic',
  'Somali',
  'Burmese',
  'Chinese',
  'Nepali',
  'French',
  'Swahili',
  'Karen',
];
const classNames = [
  'ESL Beginner Morning',
  'ESL Beginner Evening',
  'ESL Intermediate Morning',
  'ESL Intermediate Evening',
  'Advanced Conversation',
  'Citizenship Prep',
  'Digital Literacy',
  'Workplace English',
];

const generateMockClassAssignment = (
  studentId: string,
  id: string,
): ClassAssignmentDto => {
  const className = faker.helpers.arrayElement(classNames);
  return {
    id,
    studentId,
    classId: `class-${faker.string.alphanumeric(6)}`,
    className,
    classLevel: faker.helpers.arrayElement(levels),
    instructor: faker.person.fullName(),
    location: faker.helpers.arrayElement([
      'Downtown Center',
      'South Library',
      'North Campus',
      'Community Center',
    ]),
    schedule: faker.helpers.arrayElement([
      'Mon, Wed, Fri',
      'Tue, Thu',
      'Mon, Wed',
      'Sat',
    ]),
    time: faker.helpers.arrayElement([
      '9:00 AM - 11:00 AM',
      '10:00 AM - 1:00 PM',
      '2:00 PM - 4:00 PM',
      '6:00 PM - 8:00 PM',
    ]),
    enrolledCount: faker.number.int({ min: 5, max: 15 }),
    maxCapacity: faker.number.int({ min: 15, max: 20 }),
    enrolledAt: faker.date.past(),
    status: 'Enrolled',
  };
};

const generateMockTestResult = (
  studentId: string,
  id: string,
): TestResultDto => ({
  id,
  studentId,
  testType: 'BEST Test',
  testDate: faker.date.past(),
  administeredBy: faker.person.fullName(),
  rawScore: faker.number.int({ min: 30, max: 80 }),
  level: faker.number.int({ min: 1, max: 8 }),
  status: faker.helpers.arrayElement(['Improved', 'Maintained', 'Declined']),
  notes: faker.helpers.maybe(() => faker.lorem.sentence(), {
    probability: 0.3,
  }),
});

const generateMockNote = (studentId: string, id: string): StudentNoteDto => ({
  id,
  studentId,
  content: faker.lorem.paragraph(),
  createdAt: faker.date.past(),
  createdBy: faker.person.fullName(),
  updatedAt: faker.date.recent(),
});

const generateMockStudent = (
  id: string,
  llNumber: number,
): StudentDto & { id: string; displayName: string } => {
  const numClasses = faker.number.int({ min: 0, max: 3 });
  const numTests = faker.number.int({ min: 0, max: 4 });
  const numNotes = faker.number.int({ min: 0, max: 5 });

  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const nickname = faker.datatype.boolean({ probability: 0.3 })
    ? faker.person.firstName()
    : undefined;

  // Create displayName: use nickname if available, otherwise firstName
  const displayName = nickname
    ? `${nickname} ${lastName}`
    : `${firstName} ${lastName}`;

  return {
    id,
    firstName,
    lastName,
    nickname,
    displayName,
    llNumber: `${100000 + llNumber}`,
    age: faker.number.int({ min: 18, max: 70 }),
    dateOfBirth: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }),
    gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
    phone: `(402) 555-${faker.string.numeric(4)}`,
    email: faker.internet.email().toLowerCase(),
    address: faker.location.streetAddress(),
    city: 'Omaha',
    state: 'NE',
    zip: faker.location.zipCode('#####'),
    nativeCountry: faker.helpers.arrayElement(countries),
    nativeLanguage: faker.helpers.arrayElement(languages),
    refugeeStatus: faker.datatype.boolean({ probability: 0.3 }),
    snapStatus: faker.datatype.boolean({ probability: 0.4 }),
    program: faker.helpers.arrayElement(programs),
    level: faker.helpers.arrayElement(levels),
    status: faker.helpers.arrayElement(statuses),
    needsTransportation: faker.datatype.boolean({ probability: 0.3 }),
    needsChildCare: faker.datatype.boolean({ probability: 0.2 }),
    classAssignments: Array.from({ length: numClasses }, (_, i) =>
      generateMockClassAssignment(id, `class-assign-${id}-${i}`),
    ),
    testResults: Array.from({ length: numTests }, (_, i) =>
      generateMockTestResult(id, `test-${id}-${i}`),
    ),
    notes: Array.from({ length: numNotes }, (_, i) =>
      generateMockNote(id, `note-${id}-${i}`),
    ),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

// In-memory student store for CRUD operations
const mockStudents: (StudentDto & { id: string })[] = Array.from(
  { length: 50 },
  (_, i) => generateMockStudent(`student-${i + 1}`, i + 1),
);

// Class mock data
const classStatuses: ClassStatus[] = [
  'Active',
  'Upcoming',
  'Completed',
  'Cancelled',
];
const classLevels: ClassLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const classTypes: ClassType[] = [
  'ESL',
  'Citizenship',
  'GED',
  'Conversation',
  'Other',
];
const schedules = [
  'Mon, Wed, Fri',
  'Tue, Thu',
  'Sat',
  'Mon, Wed',
  'Tue, Thu, Sat',
];
const locations = [
  'Downtown Center',
  'North Branch',
  'South Library',
  'Community Center',
  'Main Campus',
];
const rooms = [
  'Room 101',
  'Room 105',
  'Room 201',
  'Room 302',
  'Meeting Room A',
  'Meeting Room B',
];

// Goal associations for classes - map class types to goals
// Goal IDs match mock-admin.service.ts: goal-1=English, goal-2=GED, goal-3=Computer, goal-4=Citizenship, goal-5=Driving, goal-6=Job Skills
const classGoalMappings: {
  type: ClassType;
  goalId: string;
  goalName: string;
}[] = [
  { type: 'ESL', goalId: 'goal-1', goalName: 'Learn English' },
  { type: 'Citizenship', goalId: 'goal-4', goalName: 'Citizenship' },
  { type: 'GED', goalId: 'goal-2', goalName: 'GED Preparation' },
  { type: 'Conversation', goalId: 'goal-1', goalName: 'Learn English' },
  { type: 'Other', goalId: 'goal-6', goalName: 'Job Skills' },
];

const generateMockClass = (
  id: string,
  index: number,
  users: any[],
): ClassDto & { id: string } => {
  const level = faker.helpers.arrayElement(classLevels);
  const type = faker.helpers.arrayElement(classTypes);
  const maxCapacity = faker.helpers.arrayElement([10, 12, 15, 20]);
  const enrolledCount = faker.number.int({ min: 3, max: maxCapacity });

  const classNames = [
    `${type} ${level} Morning`,
    `${type} ${level} Evening`,
    `${type} ${level} Weekend`,
    `${level} Conversation`,
    `${type} Prep`,
    `${level} ${type}`,
  ];

  // Find the goal mapping for this class type
  const goalMapping =
    classGoalMappings.find((m) => m.type === type) || classGoalMappings[0];

  // Get tutors and coordinators from users
  const tutors = users.filter((u: any) => u.isTutor);
  const coordinators = users.filter((u: any) => u.isCoordinator);

  // Pick a tutor and coordinator from the users
  const tutor = tutors[index % tutors.length] || users[0];
  const coordinator = coordinators[index % coordinators.length] || users[0];

  return {
    id,
    name: faker.helpers.arrayElement(classNames),
    description: faker.lorem.sentence(),
    status:
      index < 8 ? 'Active' : faker.helpers.arrayElement(['Active', 'Upcoming']),
    level,
    type,
    tutorId: tutor.id,
    tutorName: `${tutor.firstName} ${tutor.lastName}`,
    coordinatorId: coordinator.id,
    coordinatorName: `${coordinator.firstName} ${coordinator.lastName}`,
    schedule: faker.helpers.arrayElement(schedules),
    startTime: faker.helpers.arrayElement([
      '9:00 AM',
      '10:00 AM',
      '2:00 PM',
      '6:00 PM',
    ]),
    endTime: faker.helpers.arrayElement([
      '11:00 AM',
      '12:00 PM',
      '4:00 PM',
      '8:00 PM',
    ]),
    startDate: faker.date.past(),
    endDate: faker.date.future(),
    location: faker.helpers.arrayElement(locations),
    room: faker.helpers.arrayElement(rooms),
    enrolledCount,
    maxCapacity,
    waitlistCount: faker.number.int({ min: 0, max: 3 }),
    hasTransportation: faker.datatype.boolean({ probability: 0.4 }),
    hasChildcare: faker.datatype.boolean({ probability: 0.3 }),
    goalId: goalMapping.goalId,
    goalName: goalMapping.goalName,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

// In-memory class store for CRUD operations
let mockClasses: (ClassDto & { id: string })[] = Array.from(
  { length: 15 },
  (_, i) => generateMockClass(`class-${i + 1}`, i + 1, mockUsers),
);

// ============ Admin Mock Data ============

// Vehicle mock data generator
const generateMockVehicle = (
  id: string,
  index: number,
): VehicleDto & { id: string } => {
  const vehicleTypes: VehicleDto['type'][] = ['Van', 'Bus', 'Car', 'SUV'];
  const vehicleNames = [
    'Van 1',
    'Community Express',
    'Community Shuttle',
    'Student Transport A',
    'Downtown Runner',
    'East Side Van',
    'Mobility Plus',
    'Learning Express',
  ];

  return {
    id,
    name: vehicleNames[index % vehicleNames.length] || `Vehicle ${index + 1}`,
    type: faker.helpers.arrayElement(vehicleTypes),
    capacity: faker.helpers.arrayElement([4, 7, 12, 15, 20]),
    licensePlate: faker.vehicle.vrm(),
    status:
      index < 5
        ? 'Active'
        : faker.helpers.arrayElement(['Active', 'Inactive', 'Maintenance']),
    driverName: faker.person.fullName(),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

let mockVehicles: (VehicleDto & { id: string })[] = Array.from(
  { length: 8 },
  (_, i) => generateMockVehicle(`vehicle-${i + 1}`, i),
);

// Exam Type mock data generator
const generateMockExamType = (
  id: string,
  index: number,
): ExamTypeDto & { id: string } => {
  const categories: ExamTypeDto['category'][] = [
    'Placement',
    'Progress',
    'Achievement',
    'Certification',
  ];
  const examNames = [
    { name: 'BEST Plus 2.0', code: 'BEST' },
    { name: 'BEST Literacy', code: 'BEST-L' },
    { name: 'CASAS Reading', code: 'CASAS-R' },
    { name: 'CASAS Listening', code: 'CASAS-L' },
    { name: 'TABE Reading', code: 'TABE-R' },
    { name: 'TABE Math', code: 'TABE-M' },
    { name: 'US Citizenship', code: 'USC' },
    { name: 'Oral Proficiency Interview', code: 'OPI' },
    { name: 'Written Proficiency Test', code: 'WPT' },
    { name: 'Digital Literacy Assessment', code: 'DLA' },
  ];

  const exam = examNames[index % examNames.length];

  return {
    id,
    name: exam.name,
    code: exam.code,
    description: faker.lorem.sentence(),
    category: categories[index % categories.length],
    duration: faker.helpers.arrayElement([30, 45, 60, 90, 120]),
    passingScore: faker.number.int({ min: 60, max: 80 }),
    maxScore: 100,
    isActive: index < 7,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

let mockExamTypes: (ExamTypeDto & { id: string })[] = Array.from(
  { length: 10 },
  (_, i) => generateMockExamType(`exam-type-${i + 1}`, i),
);

// Location mock data generator
const generateMockLocation = (
  id: string,
  index: number,
): LocationDto & { id: string; hasChildcare: boolean } => {
  const types: LocationDto['type'][] = [
    'Center',
    'Library',
    'School',
    'Community',
    'Other',
  ];
  const locationNames = [
    { name: 'Downtown Center', code: 'DTC' },
    { name: 'South Library', code: 'SL' },
    { name: 'North Campus', code: 'NC' },
    { name: 'Community Center', code: 'CC' },
    { name: 'East Side Learning', code: 'ESL' },
    { name: 'West Branch', code: 'WB' },
    { name: 'Central High School', code: 'CHS' },
    { name: 'Main Office', code: 'MO' },
  ];

  const loc = locationNames[index % locationNames.length];

  return {
    id,
    name: loc.name,
    code: loc.code,
    address: faker.location.streetAddress(),
    city: 'Sample City',
    state: 'NE',
    zipCode: faker.location.zipCode('#####'),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    type: types[index % types.length],
    capacity: faker.number.int({ min: 20, max: 100 }),
    rooms: Array.from(
      { length: faker.number.int({ min: 2, max: 8 }) },
      (_, i) => `Room ${i + 100 + index * 10}`,
    ),
    hasParking: faker.datatype.boolean({ probability: 0.7 }),
    isAccessible: faker.datatype.boolean({ probability: 0.8 }),
    isActive: index < 6,
    // Ensure first 3 locations always have childcare for consistent mock data
    hasChildcare: index < 3 || faker.datatype.boolean({ probability: 0.3 }),
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

let mockLocations: (LocationDto & { id: string; hasChildcare: boolean })[] =
  Array.from({ length: 8 }, (_, i) =>
    generateMockLocation(`location-${i + 1}`, i),
  );

// Volunteer mock data generator
const generateMockVolunteer = (
  id: string,
  index: number,
): VolunteerDto & { id: string } => {
  const statuses: VolunteerStatus[] = [
    'Active',
    'Inactive',
    'On Leave',
    'Pending',
  ];
  const roles: VolunteerRole[] = [
    'Tutor',
    'Coordinator',
    'Intern',
    'Assistant',
    'Mentor',
  ];
  const allDays: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const allTimes: TimeOfDay[] = ['MOR', 'AFT', 'EVE'];

  // Random subset of days
  const numDays = faker.number.int({ min: 1, max: 5 });
  const availability = faker.helpers.arrayElements(allDays, numDays);

  // Random subset of times
  const numTimes = faker.number.int({ min: 1, max: 3 });
  const timeOfDay = faker.helpers.arrayElements(allTimes, numTimes);

  return {
    id,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    status: index < 8 ? 'Active' : faker.helpers.arrayElement(statuses),
    role: roles[index % roles.length],
    availability,
    timeOfDay,
    assignedClasses: faker.datatype.boolean()
      ? [mockClasses[index % mockClasses.length]?.id || '']
      : [],
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    startDate: faker.date.past({ years: 2 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

let mockVolunteers: (VolunteerDto & { id: string })[] = Array.from(
  { length: 15 },
  (_, i) => generateMockVolunteer(`volunteer-${i + 1}`, i),
);

// Queue mock data
const mockQueueUsers: QueueUserOption[] = [
  { id: 'user-1', name: 'John Smith' },
  { id: 'user-2', name: 'Sarah Johnson' },
  { id: 'user-3', name: 'Mike Davis' },
  { id: 'user-4', name: 'Emily Wilson' },
  { id: 'user-5', name: 'Current User' },
];

const generateMockQueueItem = (
  id: string,
  index: number,
): QueueItemDto & { id: string } => {
  const statuses: QueueItemStatus[] = [
    'New',
    'In Progress',
    'Waiting',
    'Completed',
    'Cancelled',
  ];
  const priorities: QueueItemPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
  const types: QueueItemType[] = [
    'Task',
    'Follow-up',
    'Call',
    'Email',
    'Meeting',
    'Review',
    'Other',
  ];
  const entities = ['student', 'class', 'volunteer'];

  const titles = [
    'Follow up with student about enrollment',
    'Review class attendance report',
    'Call volunteer about schedule change',
    'Send welcome email to new student',
    'Schedule orientation meeting',
    'Review test results for ESL class',
    'Update student contact information',
    'Prepare materials for next class',
    'Complete background check review',
    'Confirm transportation request',
    'Process enrollment application',
    'Schedule tutor training session',
    'Review curriculum updates',
    'Contact student about missed class',
    'Update volunteer availability',
  ];

  const assignee = mockQueueUsers[index % mockQueueUsers.length];
  const status =
    index < 10
      ? faker.helpers.arrayElement(['New', 'In Progress', 'Waiting'])
      : faker.helpers.arrayElement(statuses);
  const entity = faker.helpers.arrayElement(entities);

  return {
    id,
    title: titles[index % titles.length],
    description: faker.lorem.sentence(),
    type: types[index % types.length],
    status: status as QueueItemStatus,
    priority: priorities[index % priorities.length],
    assignedTo: assignee.id,
    assignedToName: assignee.name,
    relatedEntity: entity,
    relatedEntityId: `${entity}-${faker.number.int({ min: 1, max: 20 })}`,
    relatedEntityName:
      entity === 'student'
        ? faker.person.fullName()
        : entity === 'class'
          ? `ESL Level ${faker.number.int({ min: 1, max: 5 })}`
          : faker.person.fullName(),
    dueDate: faker.date.soon({ days: 14 }),
    completedDate: status === 'Completed' ? faker.date.recent() : undefined,
    notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
    createdBy: 'user-5',
    createdByName: 'Current User',
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
  };
};

let mockQueueItems: (QueueItemDto & { id: string })[] = Array.from(
  { length: 25 },
  (_, i) => generateMockQueueItem(`queue-${i + 1}`, i),
);

// ============ Exam Mock Data ============

const examCoordinators = [
  { id: 'coord-1', name: 'Sarah Johnson' },
  { id: 'coord-2', name: 'Michael Chen' },
  { id: 'coord-3', name: 'David Park' },
];

const examClasses = [
  {
    id: 'class-1',
    name: 'ESL Intermediate Morning',
    coordinatorName: 'Sarah Johnson',
  },
  {
    id: 'class-2',
    name: 'ESL Beginner Evening',
    coordinatorName: 'Michael Chen',
  },
  {
    id: 'class-3',
    name: 'Advanced Conversation',
    coordinatorName: 'David Park',
  },
];

const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const generateMockStudentExamSummary = (
  id: string,
  index: number,
): StudentExamSummaryDto & { id: string } => {
  const names = [
    'Maria Garcia',
    'Ahmed Hassan',
    'Linh Nguyen',
    'Carlos Mendoza',
    'Fatima Al-Rashid',
    'Wei Chen',
    'Sofia Rodriguez',
    'Ivan Petrov',
  ];
  const levels: StudentLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  const classInfo = examClasses[index % examClasses.length];
  const name = names[index % names.length];

  // Generate next exam dates - some due soon, some later, some none
  let nextExamDate: Date | undefined;
  if (index < 3) {
    // Due soon (within 2 weeks)
    nextExamDate = new Date();
    nextExamDate.setDate(
      nextExamDate.getDate() + faker.number.int({ min: 3, max: 14 }),
    );
  } else if (index < 6) {
    // Due later
    nextExamDate = new Date();
    nextExamDate.setDate(
      nextExamDate.getDate() + faker.number.int({ min: 20, max: 60 }),
    );
  }
  // Others have no upcoming exam

  return {
    id,
    studentId: `student-${index + 1}`,
    studentName: name,
    studentInitials: getInitials(name),
    currentLevel: levels[index % levels.length],
    examCount: faker.number.int({ min: 1, max: 4 }),
    nextExamDate,
    nextExamType: nextExamDate
      ? faker.helpers.arrayElement(['BEST Plus', 'CASAS', 'TABE'])
      : undefined,
    classId: classInfo.id,
    className: classInfo.name,
    coordinatorName: classInfo.coordinatorName,
    lastExamDate: faker.date.recent({ days: 90 }),
    lastExamScore: faker.number.int({ min: 60, max: 95 }),
  };
};

let mockStudentExamSummaries: (StudentExamSummaryDto & { id: string })[] =
  Array.from({ length: 8 }, (_, i) =>
    generateMockStudentExamSummary(`exam-summary-${i + 1}`, i),
  );

const generateMockExamRecords = (
  studentId: string,
  studentName: string,
): (ExamRecordDto & { id: string })[] => {
  const examTypes = ['BEST Plus', 'CASAS Reading', 'CASAS Listening', 'TABE'];
  const levels: StudentLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
  const count = faker.number.int({ min: 1, max: 4 });

  return Array.from({ length: count }, (_, i) => {
    // Some are past, some are near future
    const isPast = faker.datatype.boolean({ probability: 0.7 });
    const examDate = isPast
      ? faker.date.past({ years: 1 })
      : faker.date.recent({ days: 10 }); // Some very recent

    // Occasionally generate one for "next week"
    let status: ExamStatus = isPast ? 'Completed' : 'Scheduled';
    let finalDate = examDate;
    if (!isPast && faker.datatype.boolean()) {
      const future = new Date();
      future.setDate(future.getDate() + faker.number.int({ min: 1, max: 7 }));
      finalDate = future;
    }

    const score = isPast ? faker.number.int({ min: 55, max: 98 }) : undefined;
    const passed = score ? score >= 70 : undefined;
    const levelBefore = levels[Math.min(i, 2)];
    const levelAfter =
      passed && i < 2 ? levels[Math.min(i + 1, 2)] : levelBefore;

    return {
      id: `exam-${studentId}-${i + 1}`,
      studentId,
      studentName,
      examTypeId: `exam-type-${i + 1}`,
      examTypeName: examTypes[i % examTypes.length],
      examDate: finalDate,
      scheduledTime: status === 'Scheduled' ? '10:00 AM' : undefined,
      status,
      score,
      maxScore: 100,
      passingScore: 70,
      passed,
      levelBefore,
      levelAfter,
      notes: faker.datatype.boolean() ? faker.lorem.sentence() : undefined,
      administeredBy: faker.helpers.arrayElement(examCoordinators).id,
      createdAt: finalDate,
      updatedAt: finalDate,
    };
  });
};

// Generate exam records for each student
let mockExamRecords: (ExamRecordDto & { id: string })[] =
  mockStudentExamSummaries.flatMap((summary) =>
    generateMockExamRecords(summary.studentId, summary.studentName),
  );

// ============ Goals Mock Data ============

// Mock goals matching the goals from the image and mock-admin.service.ts
const mockGoals: (GoalDto & { id: string })[] = [
  {
    id: 'goal-1',
    name: 'I want to speak English',
    description: 'Develop English language proficiency for life and work',
    category: 'ENGLISH',
    icon: 'pi-language',
    color: '#4CAF50',
    sortOrder: 1,
    isActive: true,
    levels: [
      {
        goalId: 'goal-1',
        levelNumber: 1,
        name: 'Pre-Literate',
        description: 'Beginning literacy and language awareness',
        estimatedHours: 50,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-1',
        levelNumber: 2,
        name: 'Beginner',
        description: 'Basic greetings, numbers, colors',
        estimatedHours: 75,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-1',
        levelNumber: 3,
        name: 'Low Intermediate',
        description: 'Simple conversations, basic vocabulary',
        estimatedHours: 100,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-1',
        levelNumber: 4,
        name: 'Intermediate',
        description: 'Everyday situations, reading simple texts',
        estimatedHours: 150,
        hasCertificate: true,
        certificateName: 'English Intermediate Certificate',
        isActive: true,
      },
      {
        goalId: 'goal-1',
        levelNumber: 5,
        name: 'Advanced',
        description: 'Complex conversations, workplace vocabulary',
        estimatedHours: 200,
        hasCertificate: true,
        certificateName: 'English Advanced Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'BEST Tested', sortOrder: 2 },
      { name: 'Placed in Class', sortOrder: 3 },
      { name: 'Attending Classes', sortOrder: 4 },
      { name: 'Post-Tested', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-2',
    name: 'I want to find a job',
    description: 'Develop essential workplace skills and job search abilities',
    category: 'JOB',
    icon: 'pi-briefcase',
    color: '#009688',
    sortOrder: 2,
    isActive: true,
    levels: [
      {
        goalId: 'goal-2',
        levelNumber: 1,
        name: 'Resume & Applications',
        description: 'Creating resumes and job applications',
        estimatedHours: 10,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-2',
        levelNumber: 2,
        name: 'Interview Skills',
        description: 'Preparing for job interviews',
        estimatedHours: 10,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-2',
        levelNumber: 3,
        name: 'Workplace Ready',
        description: 'Workplace communication and professionalism',
        estimatedHours: 15,
        hasCertificate: true,
        certificateName: 'Workforce Ready Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Resume Created', sortOrder: 2 },
      { name: 'Interview Practice', sortOrder: 3 },
      { name: 'Job Searching', sortOrder: 4 },
      { name: 'Employed', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-3',
    name: 'I want to earn a GED',
    description: 'Prepare for the GED high school equivalency exam',
    category: 'GED',
    icon: 'pi-graduation-cap',
    color: '#2196F3',
    sortOrder: 3,
    isActive: true,
    levels: [
      {
        goalId: 'goal-3',
        levelNumber: 1,
        name: 'Math Basics',
        description: 'Foundational math skills',
        estimatedHours: 40,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-3',
        levelNumber: 2,
        name: 'Reading & Writing',
        description: 'Language arts preparation',
        estimatedHours: 40,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-3',
        levelNumber: 3,
        name: 'Science & Social Studies',
        description: 'Science and social studies preparation',
        estimatedHours: 40,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-3',
        levelNumber: 4,
        name: 'GED Ready',
        description: 'Final preparation and practice tests',
        estimatedHours: 30,
        hasCertificate: true,
        certificateName: 'GED Ready Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Orientation Complete', sortOrder: 2 },
      { name: 'Subject Testing', sortOrder: 3 },
      { name: 'GED Test Scheduled', sortOrder: 4 },
      { name: 'GED Passed', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-4',
    name: 'I want to improve my computer skills',
    description: 'Learn essential computer and digital literacy skills',
    category: 'COMPUTER',
    icon: 'pi-desktop',
    color: '#9C27B0',
    sortOrder: 4,
    isActive: true,
    levels: [
      {
        goalId: 'goal-4',
        levelNumber: 1,
        name: 'Computer Basics',
        description: 'Mouse, keyboard, and basic navigation',
        estimatedHours: 20,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-4',
        levelNumber: 2,
        name: 'Internet & Email',
        description: 'Web browsing and email communication',
        estimatedHours: 20,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-4',
        levelNumber: 3,
        name: 'Office Applications',
        description: 'Word processing and spreadsheets',
        estimatedHours: 40,
        hasCertificate: true,
        certificateName: 'Digital Literacy Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Assessment Complete', sortOrder: 2 },
      { name: 'Training in Progress', sortOrder: 3 },
      { name: 'Skills Demonstrated', sortOrder: 4 },
    ],
  },
  {
    id: 'goal-5',
    name: 'I want to go to college',
    description: 'Prepare for higher education and college admission',
    category: 'COLLEGE',
    icon: 'pi-book',
    color: '#673AB7',
    sortOrder: 5,
    isActive: true,
    levels: [
      {
        goalId: 'goal-5',
        levelNumber: 1,
        name: 'College Exploration',
        description: 'Understanding college options and requirements',
        estimatedHours: 10,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-5',
        levelNumber: 2,
        name: 'Application Ready',
        description: 'Completing applications and financial aid',
        estimatedHours: 15,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-5',
        levelNumber: 3,
        name: 'Enrolled',
        description: 'Accepted and enrolled in college program',
        estimatedHours: 0,
        hasCertificate: true,
        certificateName: 'College Ready Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Interest Expressed', sortOrder: 1 },
      { name: 'College Counseling', sortOrder: 2 },
      { name: 'Applications Submitted', sortOrder: 3 },
      { name: 'Accepted', sortOrder: 4 },
      { name: 'Enrolled', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-6',
    name: 'I want to get my drivers license',
    description: "Prepare for the driver's license written and road tests",
    category: 'DRIVING',
    icon: 'pi-car',
    color: '#FF9800',
    sortOrder: 6,
    isActive: true,
    levels: [
      {
        goalId: 'goal-6',
        levelNumber: 1,
        name: 'Rules of the Road',
        description: 'Traffic laws and signs',
        estimatedHours: 15,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-6',
        levelNumber: 2,
        name: 'Written Test Ready',
        description: 'Practice for written exam',
        estimatedHours: 10,
        hasCertificate: true,
        certificateName: 'Written Test Ready Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Class in Progress', sortOrder: 2 },
      { name: 'Practice Tests Passed', sortOrder: 3 },
      { name: 'Written Test Scheduled', sortOrder: 4 },
      { name: 'License Obtained', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-7',
    name: 'I want to pass the US citizenship test',
    description: 'Prepare for the U.S. citizenship test and interview',
    category: 'CITIZENSHIP',
    icon: 'pi-flag',
    color: '#F44336',
    sortOrder: 7,
    isActive: true,
    levels: [
      {
        goalId: 'goal-7',
        levelNumber: 1,
        name: 'Civics Knowledge',
        description: 'U.S. government and history',
        estimatedHours: 30,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-7',
        levelNumber: 2,
        name: 'Interview Preparation',
        description: 'English and interview skills',
        estimatedHours: 20,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-7',
        levelNumber: 3,
        name: 'Test Ready',
        description: 'Practice tests and final preparation',
        estimatedHours: 10,
        hasCertificate: true,
        certificateName: 'Citizenship Ready Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Civics Study', sortOrder: 2 },
      { name: 'Interview Practice', sortOrder: 3 },
      { name: 'Application Filed', sortOrder: 4 },
      { name: 'Citizenship Obtained', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-8',
    name: 'I need my foreign academic records evaluated',
    description:
      'Get foreign academic credentials evaluated for US equivalency',
    category: 'CREDENTIAL_EVAL',
    icon: 'pi-file',
    color: '#795548',
    sortOrder: 8,
    isActive: true,
    levels: [
      {
        goalId: 'goal-8',
        levelNumber: 1,
        name: 'Document Collection',
        description: 'Gathering required academic documents',
        estimatedHours: 5,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-8',
        levelNumber: 2,
        name: 'Evaluation Complete',
        description: 'Credentials evaluated and report received',
        estimatedHours: 0,
        hasCertificate: true,
        certificateName: 'Credential Evaluation Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Requested', sortOrder: 1 },
      { name: 'Documents Collected', sortOrder: 2 },
      { name: 'Submitted for Evaluation', sortOrder: 3 },
      { name: 'Evaluation Complete', sortOrder: 4 },
    ],
  },
  {
    id: 'goal-9',
    name: 'I want Healthcare careers (CPR and CNA)',
    description: 'Prepare for healthcare certifications including CPR and CNA',
    category: 'HEALTHCARE',
    icon: 'pi-heart',
    color: '#E91E63',
    sortOrder: 9,
    isActive: true,
    levels: [
      {
        goalId: 'goal-9',
        levelNumber: 1,
        name: 'CPR/First Aid',
        description: 'Basic CPR and First Aid certification',
        estimatedHours: 8,
        hasCertificate: true,
        certificateName: 'CPR/First Aid Certificate',
        isActive: true,
      },
      {
        goalId: 'goal-9',
        levelNumber: 2,
        name: 'CNA Training',
        description: 'Certified Nursing Assistant training',
        estimatedHours: 120,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-9',
        levelNumber: 3,
        name: 'CNA Certified',
        description: 'Passed state CNA examination',
        estimatedHours: 0,
        hasCertificate: true,
        certificateName: 'CNA Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'CPR Complete', sortOrder: 2 },
      { name: 'CNA Training', sortOrder: 3 },
      { name: 'Clinical Hours', sortOrder: 4 },
      { name: 'State Exam Passed', sortOrder: 5 },
    ],
  },
  {
    id: 'goal-10',
    name: 'I want Commercial Drivers License (CDL) prep class',
    description: 'Prepare for the Commercial Drivers License examination',
    category: 'CDL',
    icon: 'pi-truck',
    color: '#607D8B',
    sortOrder: 10,
    isActive: true,
    levels: [
      {
        goalId: 'goal-10',
        levelNumber: 1,
        name: 'CDL Knowledge',
        description: 'General CDL knowledge and regulations',
        estimatedHours: 30,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-10',
        levelNumber: 2,
        name: 'Written Test Ready',
        description: 'Ready for CDL written examination',
        estimatedHours: 20,
        hasCertificate: true,
        certificateName: 'CDL Written Test Ready',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Class in Progress', sortOrder: 2 },
      { name: 'Practice Tests', sortOrder: 3 },
      { name: 'CDL Obtained', sortOrder: 4 },
    ],
  },
  {
    id: 'goal-11',
    name: 'I want Para prep and Teacher prep class',
    description: 'Prepare for paraprofessional or teaching career',
    category: 'EDUCATION_CAREER',
    icon: 'pi-users',
    color: '#00BCD4',
    sortOrder: 11,
    isActive: true,
    levels: [
      {
        goalId: 'goal-11',
        levelNumber: 1,
        name: 'Para Fundamentals',
        description:
          'Understanding paraprofessional roles and responsibilities',
        estimatedHours: 20,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-11',
        levelNumber: 2,
        name: 'ParaPro Test Prep',
        description: 'Preparation for ParaPro Assessment',
        estimatedHours: 30,
        hasCertificate: true,
        certificateName: 'ParaPro Ready Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Training in Progress', sortOrder: 2 },
      { name: 'Test Preparation', sortOrder: 3 },
      { name: 'Certification Obtained', sortOrder: 4 },
    ],
  },
  {
    id: 'goal-12',
    name: 'I want Food Safety and Handling class',
    description: 'Learn food safety and handling for food service careers',
    category: 'FOOD_SAFETY',
    icon: 'pi-shopping-bag',
    color: '#8BC34A',
    sortOrder: 12,
    isActive: true,
    levels: [
      {
        goalId: 'goal-12',
        levelNumber: 1,
        name: 'Food Safety Basics',
        description: 'Basic food safety and sanitation',
        estimatedHours: 8,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-12',
        levelNumber: 2,
        name: 'ServSafe Certified',
        description: 'ServSafe Food Handler certification',
        estimatedHours: 8,
        hasCertificate: true,
        certificateName: 'ServSafe Food Handler Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Class in Progress', sortOrder: 2 },
      { name: 'Exam Scheduled', sortOrder: 3 },
      { name: 'Certified', sortOrder: 4 },
    ],
  },
  {
    id: 'goal-13',
    name: 'I want a reading and writing class / pre-literate',
    description:
      'Develop basic reading and writing skills for pre-literate learners',
    category: 'PRE_LITERATE',
    icon: 'pi-pencil',
    color: '#FF5722',
    sortOrder: 13,
    isActive: true,
    levels: [
      {
        goalId: 'goal-13',
        levelNumber: 1,
        name: 'Letter Recognition',
        description: 'Learning the alphabet and letter sounds',
        estimatedHours: 50,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-13',
        levelNumber: 2,
        name: 'Basic Words',
        description: 'Reading and writing simple words',
        estimatedHours: 75,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-13',
        levelNumber: 3,
        name: 'Simple Sentences',
        description: 'Reading and writing basic sentences',
        estimatedHours: 100,
        hasCertificate: true,
        certificateName: 'Beginning Literacy Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Assessment Complete', sortOrder: 2 },
      { name: 'Class in Progress', sortOrder: 3 },
      { name: 'Level Advancement', sortOrder: 4 },
    ],
  },
  {
    id: 'goal-14',
    name: 'I want to learn about banks and money in the United States',
    description:
      'Learn financial literacy including banking, budgeting, and money management',
    category: 'FINANCIAL_LITERACY',
    icon: 'pi-dollar',
    color: '#3F51B5',
    sortOrder: 14,
    isActive: true,
    levels: [
      {
        goalId: 'goal-14',
        levelNumber: 1,
        name: 'Banking Basics',
        description: 'Understanding bank accounts and services',
        estimatedHours: 6,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-14',
        levelNumber: 2,
        name: 'Budgeting & Saving',
        description: 'Creating budgets and saving strategies',
        estimatedHours: 6,
        hasCertificate: false,
        isActive: true,
      },
      {
        goalId: 'goal-14',
        levelNumber: 3,
        name: 'Financially Literate',
        description: 'Understanding credit, loans, and financial planning',
        estimatedHours: 8,
        hasCertificate: true,
        certificateName: 'Financial Literacy Certificate',
        isActive: true,
      },
    ],
    pipeline: [
      { name: 'Enrolled', sortOrder: 1 },
      { name: 'Class in Progress', sortOrder: 2 },
      { name: 'Bank Account Opened', sortOrder: 3 },
      { name: 'Course Complete', sortOrder: 4 },
    ],
  },
];

// Generate student goals for mock students
// Assign 1-4 random goals to each student
const generateMockStudentGoals = (): (StudentGoalDto & { id: string })[] => {
  const studentGoals: (StudentGoalDto & { id: string })[] = [];

  mockStudents.forEach((student, studentIndex) => {
    // Each student gets 1-4 goals
    const numGoals = faker.number.int({ min: 1, max: 4 });
    const selectedGoalIds = faker.helpers.arrayElements(
      mockGoals.map((g) => g.id),
      numGoals,
    );

    selectedGoalIds.forEach((goalId, goalIndex) => {
      const goal = mockGoals.find((g) => g.id === goalId)!;
      const maxLevel = goal.levels?.length || 3;
      const currentLevel = faker.number.int({ min: 0, max: maxLevel });
      const statuses: ('active' | 'completed' | 'on_hold' | 'abandoned')[] = [
        'active',
        'completed',
        'on_hold',
        'abandoned',
      ];
      const status =
        currentLevel >= maxLevel
          ? 'completed'
          : (faker.helpers.arrayElement([
              'active',
              'active',
              'active',
              'on_hold',
            ]) as any);

      studentGoals.push({
        id: `student-goal-${student.id}-${goalId}`,
        studentId: student.id,
        goalId,
        currentLevel,
        status,
        priority: goalIndex + 1,
        startedAt: faker.date.past({ years: 1 }),
        targetDate: faker.date.future({ years: 1 }),
        completedAt: status === 'completed' ? faker.date.recent() : undefined,
        notes: faker.datatype.boolean({ probability: 0.3 })
          ? faker.lorem.sentence()
          : undefined,
        goal,
        goalName: goal.name,
        goalCategory: goal.category,
      });
    });
  });

  return studentGoals;
};

let mockStudentGoals: (StudentGoalDto & { id: string })[] =
  generateMockStudentGoals();

// Student goal level status tracking
interface StudentGoalLevelStatus {
  studentGoalId: string;
  goalId: string;
  levelName: string;
  complete: boolean;
}

// Generate level completion status for student goals
const generateStudentGoalLevelStatuses = (): Map<
  string,
  StudentGoalLevelStatus[]
> => {
  const statusMap = new Map<string, StudentGoalLevelStatus[]>();

  mockStudentGoals.forEach((sg) => {
    const goal = mockGoals.find((g) => g.id === sg.goalId);
    if (!goal?.levels) return;

    const key = `${sg.studentId}-${sg.goalId}`;
    const levels = goal.levels.map((level) => ({
      studentGoalId: sg.id,
      goalId: sg.goalId,
      levelName: level.name,
      complete: level.levelNumber <= (sg.currentLevel || 0),
    }));

    statusMap.set(key, levels);
  });

  return statusMap;
};

let mockStudentGoalLevelStatuses = generateStudentGoalLevelStatuses();

// Student pipeline tracking
interface StudentPipelineStageStatus {
  name: string;
  sortOrder: number;
  completed: boolean;
}

interface GoalPipelineStatus {
  studentGoalId: string;
  goalId: string;
  goalName: string;
  pipeline: StudentPipelineStageStatus[];
}

// Generate pipeline statuses for student goals
const generateStudentPipelines = (): Map<string, GoalPipelineStatus[]> => {
  const pipelineMap = new Map<string, GoalPipelineStatus[]>();

  mockStudents.forEach((student) => {
    const studentGoalsForStudent = mockStudentGoals.filter(
      (sg) => sg.studentId === student.id,
    );
    const pipelines: GoalPipelineStatus[] = [];

    studentGoalsForStudent.forEach((sg) => {
      const goal = mockGoals.find((g) => g.id === sg.goalId);
      if (!goal?.pipeline) return;

      // Randomly complete some pipeline stages based on student goal progress
      const completedCount = faker.number.int({
        min: 0,
        max: goal.pipeline.length,
      });

      pipelines.push({
        studentGoalId: sg.id,
        goalId: sg.goalId,
        goalName: goal.name,
        pipeline: goal.pipeline.map((stage, index) => ({
          ...stage,
          completed: index < completedCount,
        })),
      });
    });

    pipelineMap.set(student.id, pipelines);
  });

  return pipelineMap;
};

let mockStudentPipelines = generateStudentPipelines();

// ============ Appointment Mock Data ============
let mockAppointments: (AppointmentDto & { id: string })[] = [];
const generateMockAppointments = () => {
  const appointments: (AppointmentDto & { id: string })[] = [];
  const appointmentTypes: AppointmentType[] = [
    'BEST_TEST',
    'TEST',
    'intake',
    'follow_up',
    'OTHER',
  ];
  const coordinators = mockUsers.filter((u) => u.isCoordinator);

  // Generate appointments for the past 30 days and next 30 days
  for (let dayOffset = -30; dayOffset <= 30; dayOffset++) {
    const date = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Skip weekends for most appointments
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Generate 2-5 appointments per day
    const numAppointments = faker.number.int({ min: 2, max: 5 });
    for (let i = 0; i < numAppointments; i++) {
      const student = faker.helpers.arrayElement(mockStudents);
      const coordinator = faker.helpers.arrayElement(coordinators);
      const hour = faker.number.int({ min: 9, max: 16 });
      const minute = faker.helpers.arrayElement([0, 15, 30, 45]);
      const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const appointmentType = faker.helpers.arrayElement(appointmentTypes);

      appointments.push({
        id: `appointment-${dateStr}-${i + 1}`,
        date: dateStr,
        startTime,
        title: faker.helpers.arrayElement([
          'Intake Interview',
          'BEST Plus Test',
          'Progress Review',
          'Enrollment Meeting',
          'Assessment Scheduling',
          'Follow-up Session',
        ]),
        appointmentType,
        duration: faker.helpers.arrayElement([30, 45, 60, 90]),
        description: faker.lorem.sentence(),
        creator: 'System',
        createdAt: faker.date.past({ years: 1 }).toISOString(),
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        userId: coordinator.id,
        userDisplayName: `${coordinator.firstName} ${coordinator.lastName}`,
      });
    }
  }

  return appointments;
};
mockAppointments = generateMockAppointments();

// Parse query parameters for pagination
const parseQueryParams = (url: URL) => {
  const take = parseInt(url.searchParams.get('take') || '10', 10);
  const skip = parseInt(url.searchParams.get('skip') || '0', 10);
  return { take, skip };
};

export const handlers = [
  // ============ Attendance Sessions Endpoints ============

  // In-memory sessions and attendance storage
  http.get('/api/v1/attendance/sessions', ({ request }) => {
    const url = new URL(request.url);
    const dateParam =
      url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    const coordinatorId = url.searchParams.get('coordinatorId') || undefined;

    // Build a reasonable set of sessions for the date
    const activeClasses = mockClasses.filter((c) => c.status === 'Active');
    const filteredClasses = coordinatorId
      ? activeClasses.filter((c) => c.coordinatorId === coordinatorId)
      : activeClasses;

    const classesForDay = filteredClasses.slice(
      0,
      Math.min(6, filteredClasses.length),
    );

    const sessions: SessionWithAttendance[] = classesForDay.map((cls, idx) => {
      const sessionId = `session-${cls.id}-${dateParam}`;
      const startTimes = ['9:00 AM', '10:00 AM', '2:00 PM', '6:00 PM'];
      const endTimes = ['11:00 AM', '12:00 PM', '4:00 PM', '8:00 PM'];

      // Generate attendance records for this session
      const totalEnrolled = Math.max(cls.enrolledCount || 12, 8);
      const studentsForSession = faker.helpers.arrayElements(
        mockStudents,
        Math.min(totalEnrolled, mockStudents.length),
      );
      const statuses: AttendanceRecordDto['status'][] = [
        'Present',
        'Absent',
        'Excused',
        'Unmarked',
      ];

      const attendanceRecords: AttendanceRecordDto[] = studentsForSession.map(
        (s, i) => {
          const status = faker.helpers.arrayElement(statuses);
          return {
            id: `att-${sessionId}-${s.id}`,
            sessionId,
            classId: cls.id,
            studentId: s.id,
            studentName: `${s.firstName} ${s.lastName}`,
            status,
            notes: faker.datatype.boolean({ probability: 0.15 })
              ? faker.lorem.words(6)
              : undefined,
            markedAt: status === 'Unmarked' ? undefined : faker.date.recent(),
            markedBy:
              status === 'Unmarked' ? undefined : faker.person.fullName(),
            lastAttendedAt:
              status === 'Present'
                ? `${faker.number.int({ min: 0, max: 14 })}d ago`
                : undefined,
            createdAt: faker.date.past(),
            updatedAt: faker.date.recent(),
          };
        },
      );

      const presentCount = attendanceRecords.filter(
        (a) => a.status === 'Present',
      ).length;
      const absentCount = attendanceRecords.filter(
        (a) => a.status === 'Absent',
      ).length;
      const excusedCount = attendanceRecords.filter(
        (a) => a.status === 'Excused',
      ).length;
      const unmarkedCount = attendanceRecords.filter(
        (a) => a.status === 'Unmarked',
      ).length;

      const session: SessionWithAttendance = {
        id: sessionId,
        classId: cls.id,
        className: cls.name,
        maxCapacity: cls.maxCapacity,
        date: new Date(`${dateParam}T00:00:00Z`),
        startTime: startTimes[idx % startTimes.length],
        endTime: endTimes[idx % endTimes.length],
        topic: faker.datatype.boolean({ probability: 0.5 })
          ? faker.lorem.words(3)
          : undefined,
        notes: faker.datatype.boolean({ probability: 0.3 })
          ? faker.lorem.sentence()
          : undefined,
        tutorId: cls.tutorId,
        tutorName: cls.tutorName,
        coordinatorId: cls.coordinatorId,
        coordinatorName: cls.coordinatorName,
        location: cls.location,
        room: cls.room,
        isVirtual: faker.datatype.boolean({ probability: 0.2 }),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        attendanceRecords,
        presentCount,
        absentCount,
        excusedCount,
        unmarkedCount,
        totalEnrolled,
      };

      return session;
    });

    return HttpResponse.json(sessions);
  }),

  // Get single session with attendance
  http.get('/api/v1/attendance/sessions/:id', ({ params }) => {
    const sessionId = params['id'] as string;

    // Attempt to infer class and date from id
    const parts = sessionId.split('session-').pop()?.split('-') || [];
    const clsId = parts.slice(0, parts.length - 3).join('-') || parts[0];
    const datePart = parts.slice(-3).join('-');
    const classItem = mockClasses.find((c) => sessionId.includes(c.id));
    if (!classItem) {
      return new HttpResponse(null, { status: 404 });
    }

    // Reuse the list endpoint logic for consistency
    const baseDate = datePart || new Date().toISOString().split('T')[0];
    const startTimes = ['9:00 AM', '10:00 AM', '2:00 PM', '6:00 PM'];
    const endTimes = ['11:00 AM', '12:00 PM', '4:00 PM', '8:00 PM'];

    const totalEnrolled = Math.max(classItem.enrolledCount || 12, 8);
    const studentsForSession = faker.helpers.arrayElements(
      mockStudents,
      Math.min(totalEnrolled, mockStudents.length),
    );
    const statuses: AttendanceRecordDto['status'][] = [
      'Present',
      'Absent',
      'Excused',
      'Unmarked',
    ];

    const attendanceRecords: AttendanceRecordDto[] = studentsForSession.map(
      (s) => {
        const status = faker.helpers.arrayElement(statuses);
        return {
          id: `att-${sessionId}-${s.id}`,
          sessionId,
          classId: classItem.id,
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          status,
          notes: faker.datatype.boolean({ probability: 0.15 })
            ? faker.lorem.words(6)
            : undefined,
          markedAt: status === 'Unmarked' ? undefined : faker.date.recent(),
          markedBy: status === 'Unmarked' ? undefined : faker.person.fullName(),
          lastAttendedAt:
            status === 'Present'
              ? `${faker.number.int({ min: 0, max: 14 })}d ago`
              : undefined,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        };
      },
    );

    const presentCount = attendanceRecords.filter(
      (a) => a.status === 'Present',
    ).length;
    const absentCount = attendanceRecords.filter(
      (a) => a.status === 'Absent',
    ).length;
    const excusedCount = attendanceRecords.filter(
      (a) => a.status === 'Excused',
    ).length;
    const unmarkedCount = attendanceRecords.filter(
      (a) => a.status === 'Unmarked',
    ).length;

    const session: SessionWithAttendance = {
      id: sessionId,
      classId: classItem.id,
      className: classItem.name,
      maxCapacity: classItem.maxCapacity,
      date: new Date(`${baseDate}T00:00:00Z`),
      startTime: startTimes[0],
      endTime: endTimes[0],
      topic: faker.datatype.boolean({ probability: 0.5 })
        ? faker.lorem.words(3)
        : undefined,
      notes: faker.datatype.boolean({ probability: 0.3 })
        ? faker.lorem.sentence()
        : undefined,
      tutorId: classItem.tutorId,
      tutorName: classItem.tutorName,
      coordinatorId: classItem.coordinatorId,
      coordinatorName: classItem.coordinatorName,
      location: classItem.location,
      room: classItem.room,
      isVirtual: faker.datatype.boolean({ probability: 0.2 }),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      attendanceRecords,
      presentCount,
      absentCount,
      excusedCount,
      unmarkedCount,
      totalEnrolled,
    };

    return HttpResponse.json(session);
  }),

  // Get attendance records for a session
  http.get('/api/v1/attendance/sessions/:sessionId/records', ({ params }) => {
    const sessionId = params['sessionId'] as string;
    // Generate deterministic records similar to the single session endpoint
    const classItem = mockClasses.find((c) => sessionId.includes(c.id));
    if (!classItem) {
      return HttpResponse.json([]);
    }
    const totalEnrolled = Math.max(classItem.enrolledCount || 12, 8);
    const studentsForSession = faker.helpers.arrayElements(
      mockStudents,
      Math.min(totalEnrolled, mockStudents.length),
    );
    const statuses: AttendanceRecordDto['status'][] = [
      'Present',
      'Absent',
      'Excused',
      'Unmarked',
    ];
    const attendanceRecords: AttendanceRecordDto[] = studentsForSession.map(
      (s) => {
        const status = faker.helpers.arrayElement(statuses);
        return {
          id: `att-${sessionId}-${s.id}`,
          sessionId,
          classId: classItem.id,
          studentId: s.id,
          studentName: `${s.firstName} ${s.lastName}`,
          status,
          notes: faker.datatype.boolean({ probability: 0.15 })
            ? faker.lorem.words(6)
            : undefined,
          markedAt: status === 'Unmarked' ? undefined : faker.date.recent(),
          markedBy: status === 'Unmarked' ? undefined : faker.person.fullName(),
          lastAttendedAt:
            status === 'Present'
              ? `${faker.number.int({ min: 0, max: 14 })}d ago`
              : undefined,
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent(),
        };
      },
    );
    return HttpResponse.json(attendanceRecords);
  }),

  // Update single attendance record
  http.put(
    '/api/v1/attendance/sessions/:sessionId/records/:recordId',
    async ({ params, request }) => {
      const update = (await request.json()) as Partial<AttendanceRecordDto>;
      // Return success; since this is mock, we don't persist
      return HttpResponse.json({
        success: true,
        message: 'Attendance record updated',
        id: params['recordId'],
      });
    },
  ),

  // Mark attendance for a student (legacy style)
  http.post(
    '/api/v1/attendance/sessions/:sessionId/mark',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        studentId: string;
        status: AttendanceRecordDto['status'];
        notes?: string;
      };
      return HttpResponse.json({
        success: true,
        message: `Marked ${body.status} for student`,
        id: `${params['sessionId']}-${body.studentId}`,
      });
    },
  ),

  // Batch update attendance
  http.post(
    '/api/v1/attendance/sessions/:sessionId/batch',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        records: { studentId: string; status: AttendanceRecordDto['status'] }[];
      };
      return HttpResponse.json({
        success: true,
        message: `Updated ${body.records?.length || 0} records`,
        id: params['sessionId'],
      });
    },
  ),
  // ============ Account/User Endpoints ============

  // Get users list
  http.get('/api/v1/account/users', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const lookupList = url.searchParams.get('lookupList') === 'true';
    const isTutorFilter = url.searchParams.get('isTutor') === 'true';
    const isCoordinatorFilter =
      url.searchParams.get('isCoordinator') === 'true';

    if (lookupList) {
      let filteredUsers = [...mockUsers];

      // Filter by isTutor if specified
      if (isTutorFilter) {
        filteredUsers = filteredUsers.filter((u: any) => u.isTutor === true);
      }

      // Filter by isCoordinator if specified
      if (isCoordinatorFilter) {
        filteredUsers = filteredUsers.filter(
          (u: any) => u.isCoordinator === true,
        );
      }

      const options = filteredUsers.map((u) => ({
        value: u.id,
        label: `${u.firstName} ${u.lastName}`,
      }));
      return HttpResponse.json(options);
    }

    const paginatedItems = mockUsers.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: mockUsers.length,
      take,
      skip,
    });
  }),

  // Get single user
  http.get('/api/v1/account/users/:id', ({ params }) => {
    const { id } = params;
    const user = mockUsers.find((u) => u.id === id);
    if (user) {
      return HttpResponse.json(user);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create user
  http.post('/api/v1/account/users', async ({ request }) => {
    const body = await request.json();
    const newId = `user-${mockUsers.length + 1}`;
    return HttpResponse.json({
      success: true,
      message: 'User created successfully',
      id: newId,
    });
  }),

  // Update user
  http.put('/api/v1/account/users/:id', async ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'User updated successfully',
      id: params['id'],
    });
  }),

  // Delete user
  http.delete('/api/v1/account/users/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'User deleted successfully',
      id: params['id'],
    });
  }),

  // Get current profile
  http.get('/api/v1/profile', () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      username: 'bsmith@example.com',
      email: 'bsmith@example.com',
      firstName: 'Bob',
      lastName: 'Smith',
      role: 'admin',
      title: 'Software Developer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // Update profile
  http.put('/api/v1/profile', async () => {
    return HttpResponse.json({
      success: true,
      message: 'Profile updated successfully',
    });
  }),

  // Reset password
  http.post('/api/v1/account/:id/reset-password', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'Password reset email sent',
      id: params['id'],
    });
  }),

  // Add user to tenant
  http.post('/api/v1/account/tenant/add-user', async () => {
    return HttpResponse.json({
      success: true,
      message: 'User added to tenant',
    });
  }),

  // Remove user from tenant
  http.post('/api/v1/account/tenant/remove-user', async () => {
    return HttpResponse.json({
      success: true,
      message: 'User removed from tenant',
    });
  }),

  // ============ Agent Endpoints ============

  // Get conversations list
  http.get('/api/v1/agent/conversations', () => {
    return HttpResponse.json({
      items: mockConversations.map((conv) => ({ id: conv.id, item: conv })),
      total: mockConversations.length,
      take: 100,
      skip: 0,
    });
  }),

  // Get single conversation
  http.get('/api/v1/agent/conversations/:id', ({ params }) => {
    const { id } = params;
    const conv = mockConversations.find((c) => c.id === id);
    if (conv) {
      return HttpResponse.json(conv);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Get conversation messages
  http.get('/api/v1/agent/conversations/:id/messages', ({ params }) => {
    const { id } = params;
    const conv = mockConversations.find((c) => c.id === id);
    return HttpResponse.json(conv?.messages || []);
  }),

  // Create conversation
  http.post('/api/v1/agent/conversations', async ({ request }) => {
    const body = (await request.json()) as { title?: string };
    const newId = `conv-${mockConversations.length + 1}`;
    const newConversation = {
      id: newId,
      title: body.title || 'New Conversation',
      status: 'active',
      messages: [],
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ conversation: newConversation });
  }),

  // Chat in conversation
  http.post('/api/v1/agent/conversations/:id/chat', async ({ request }) => {
    const body = (await request.json()) as { message: string };
    const conversationId = new URL(request.url).pathname.split('/')[4];

    return HttpResponse.json({
      message: `This is a mock response to: "${body.message}". I'm the AI agent running in mock mode.`,
      conversationId,
      toolsUsed: ['mock_tool'],
      links: [],
    });
  }),

  // Quick chat
  http.post('/api/v1/agent/chat', async ({ request }) => {
    const body = (await request.json()) as { message: string };
    const newId = `conv-${Date.now()}`;

    return HttpResponse.json({
      message: `This is a mock quick chat response to: "${body.message}"`,
      conversationId: newId,
      toolsUsed: [],
      links: [],
    });
  }),

  // Archive conversation
  http.post('/api/v1/agent/conversations/:id/archive', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Delete conversation
  http.delete('/api/v1/agent/conversations/:id', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // Get agent capabilities
  http.get('/api/v1/agent/capabilities', () => {
    return HttpResponse.json({
      tools: [
        {
          name: 'search_contacts',
          description: 'Search contacts by name, email, or phone',
        },
        {
          name: 'get_contact',
          description: 'Get detailed contact information',
        },
        { name: 'create_contact', description: 'Create a new contact' },
        {
          name: 'get_upcoming_events',
          description: 'Get events in the next N days',
        },
        { name: 'send_message', description: 'Send a message to a contact' },
      ],
      model: 'claude-sonnet-4-20250514',
    });
  }),

  // ============ Tenant Endpoints ============

  // Get tenants list
  http.get('/api/v1/tenant', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);

    const mockTenants = [
      {
        id: 'tenant-1',
        name: 'Default Tenant',
        description: 'The default tenant',
      },
      { id: 'tenant-2', name: 'Test Tenant', description: 'A test tenant' },
    ];

    return HttpResponse.json({
      items: mockTenants.map((t) => ({ id: t.id, item: t })),
      total: mockTenants.length,
      take,
      skip,
    });
  }),

  // Get single tenant
  http.get('/api/v1/tenant/:id', ({ params }) => {
    return HttpResponse.json({
      id: params['id'],
      name: 'Mock Tenant',
      description: 'A mock tenant for testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),

  // Create tenant
  http.post('/api/v1/tenant', async () => {
    return HttpResponse.json({
      success: true,
      message: 'Tenant created successfully',
      id: `tenant-${Date.now()}`,
    });
  }),

  // Update tenant
  http.put('/api/v1/tenant/:id', async ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'Tenant updated successfully',
      id: params['id'],
    });
  }),

  // Delete tenant
  http.delete('/api/v1/tenant/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: 'Tenant deleted successfully',
      id: params['id'],
    });
  }),

  // Get tenant users
  http.get('/api/v1/tenant/:tenantId/user', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);

    const tenantUsers = mockUsers.slice(0, 5);
    return HttpResponse.json({
      items: tenantUsers.map((u) => ({ id: u.id, item: u })),
      total: tenantUsers.length,
      take,
      skip,
    });
  }),

  // Add user to tenant
  http.post('/api/v1/tenant/:tenantId/user/:userId', () => {
    return HttpResponse.json({
      success: true,
      message: 'User added to tenant successfully',
    });
  }),

  // Remove user from tenant
  http.delete('/api/v1/tenant/:tenantId/user/:userId', () => {
    return HttpResponse.json({
      success: true,
      message: 'User removed from tenant successfully',
    });
  }),

  // ============ Auth Endpoints ============

  // Auth setup
  http.get('/api/v1/auth/setup', () => {
    return HttpResponse.json({
      providers: ['apikey', 'cognito', 'microsoft'],
      cognitoConfig: {
        userPoolId: 'mock-pool-id',
        clientId: 'mock-client-id',
        domain: 'mock-domain',
        region: 'us-east-1',
      },
    });
  }),

  // Signin
  http.post('/api/v1/auth/signin', async () => {
    return HttpResponse.json({
      accessToken: 'mock-jwt-token',
      accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'mock-refresh-token',
      refreshTokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      user: {
        id: 'mock-user-id',
        username: 'bsmith@example.com',
        firstName: 'Bob',
        lastName: 'Smith',
        email: 'bsmith@example.com',
        role: 'admin',
        tenants: [{ id: 'default-tenant-id', name: 'default' }],
      },
      currentTenantId: 'default-tenant-id',
      currentTenantName: 'default',
    });
  }),

  // Refresh token
  http.post('/api/v1/auth/refresh', async () => {
    return HttpResponse.json({
      accessToken: 'mock-refreshed-jwt-token',
      accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'mock-refresh-token',
      refreshTokenExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  }),

  // Signout
  http.post('/api/v1/auth/signout', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  // ============ Student Endpoints ============

  // Get students list
  http.get('/api/v1/student', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const filter = url.searchParams.get('filter')?.toLowerCase();
    const statusFilter = url.searchParams.get('status');

    let filteredStudents = [...mockStudents];

    // Apply status filter
    if (statusFilter && statusFilter !== 'All') {
      filteredStudents = filteredStudents.filter(
        (s) => s.status === statusFilter,
      );
    }

    // Apply text filter (search by name or LL#)
    if (filter) {
      filteredStudents = filteredStudents.filter(
        (s) =>
          s.firstName.toLowerCase().includes(filter) ||
          s.lastName.toLowerCase().includes(filter) ||
          s.llNumber?.includes(filter) ||
          s.email?.toLowerCase().includes(filter),
      );
    }

    const paginatedItems = filteredStudents.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filteredStudents.length,
      take,
      skip,
    });
  }),

  // Get single student
  http.get('/api/v1/student/:id', ({ params }) => {
    const student = mockStudents.find((s) => s.id === params['id']);
    if (student) {
      return HttpResponse.json(student);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create student
  http.post('/api/v1/student', async ({ request }) => {
    const body = (await request.json()) as StudentDto;
    const newId = `student-${mockStudents.length + 1}`;
    const newStudent = {
      ...body,
      id: newId,
      llNumber: `${100000 + mockStudents.length + 1}`,
      classAssignments: [],
      testResults: [],
      notes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStudents.push(newStudent);
    return HttpResponse.json({
      success: true,
      message: 'Student created successfully',
      id: newId,
    });
  }),

  // Update student
  http.put('/api/v1/student/:id', async ({ params, request }) => {
    const body = (await request.json()) as StudentDto;
    const index = mockStudents.findIndex((s) => s.id === params['id']);
    if (index !== -1) {
      mockStudents[index] = {
        ...mockStudents[index],
        ...body,
        id: params['id'] as string,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Student updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete student
  http.delete('/api/v1/student/:id', ({ params }) => {
    const index = mockStudents.findIndex((s) => s.id === params['id']);
    if (index !== -1) {
      mockStudents.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Student deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Student Notes Endpoints ============

  // Get student notes
  http.get('/api/v1/student/:studentId/notes', ({ params }) => {
    const student = mockStudents.find((s) => s.id === params['studentId']);
    if (student) {
      return HttpResponse.json(student.notes || []);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Add student note
  http.post('/api/v1/student/:studentId/notes', async ({ params, request }) => {
    const student = mockStudents.find((s) => s.id === params['studentId']);
    if (student) {
      const body = (await request.json()) as StudentNoteDto;
      const newNote: StudentNoteDto = {
        ...body,
        id: `note-${Date.now()}`,
        studentId: params['studentId'] as string,
        createdAt: new Date(),
        createdBy: 'Current User',
        updatedAt: new Date(),
      };
      if (!student.notes) student.notes = [];
      student.notes.push(newNote);
      return HttpResponse.json({
        success: true,
        message: 'Note added successfully',
        id: newNote.id,
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Update student note
  http.put(
    '/api/v1/student/:studentId/notes/:noteId',
    async ({ params, request }) => {
      const student = mockStudents.find((s) => s.id === params['studentId']);
      if (student && student.notes) {
        const noteIndex = student.notes.findIndex(
          (n) => n.id === params['noteId'],
        );
        if (noteIndex !== -1) {
          const body = (await request.json()) as StudentNoteDto;
          student.notes[noteIndex] = {
            ...student.notes[noteIndex],
            ...body,
            updatedAt: new Date(),
          };
          return HttpResponse.json({
            success: true,
            message: 'Note updated successfully',
            id: params['noteId'],
          });
        }
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // Delete student note
  http.delete('/api/v1/student/:studentId/notes/:noteId', ({ params }) => {
    const student = mockStudents.find((s) => s.id === params['studentId']);
    if (student && student.notes) {
      const noteIndex = student.notes.findIndex(
        (n) => n.id === params['noteId'],
      );
      if (noteIndex !== -1) {
        student.notes.splice(noteIndex, 1);
        return HttpResponse.json({
          success: true,
          message: 'Note deleted successfully',
          id: params['noteId'],
        });
      }
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Student Appointment Endpoints ============

  // Get student appointments
  http.get('/api/v1/student/:studentId/appointments', ({ request, params }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const studentId = params['studentId'] as string;

    const studentAppointments = mockAppointments.filter(
      (a) => a.studentId === studentId,
    );
    const items = studentAppointments.slice(skip, skip + take);

    return HttpResponse.json({
      items: items.map((item) => ({ item, id: item.id })),
      total: studentAppointments.length,
      take,
      skip,
    });
  }),

  // Create student appointment
  http.post(
    '/api/v1/student/:studentId/appointments',
    async ({ params, request }) => {
      const studentId = params['studentId'] as string;
      const student = mockStudents.find((s) => s.id === studentId);

      if (!student) {
        return new HttpResponse(null, { status: 404 });
      }

      const body = (await request.json()) as any;
      const newAppointment: AppointmentDto & { id: string } = {
        id: `appointment-${Date.now()}`,
        date: body.date,
        startTime: body.startTime,
        title: body.title,
        appointmentType: body.appointmentType,
        duration: body.duration || 30,
        description: body.description,
        creator: 'Current User',
        createdAt: new Date().toISOString(),
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        userId: body.userId,
        userDisplayName: body.userDisplayName,
      };
      mockAppointments.push(newAppointment);

      return HttpResponse.json({
        success: true,
        id: newAppointment.id,
      });
    },
  ),

  // Update student appointment
  http.put(
    '/api/v1/student/:studentId/appointments/:appointmentId',
    async ({ params, request }) => {
      const appointmentId = params['appointmentId'] as string;
      const index = mockAppointments.findIndex((a) => a.id === appointmentId);

      if (index === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      const body = (await request.json()) as any;
      mockAppointments[index] = { ...mockAppointments[index], ...body };

      return HttpResponse.json({
        success: true,
        id: appointmentId,
      });
    },
  ),

  // Delete student appointment
  http.delete(
    '/api/v1/student/:studentId/appointments/:appointmentId',
    ({ params }) => {
      const appointmentId = params['appointmentId'] as string;
      const index = mockAppointments.findIndex((a) => a.id === appointmentId);

      if (index === -1) {
        return new HttpResponse(null, { status: 404 });
      }

      mockAppointments.splice(index, 1);

      return HttpResponse.json({
        success: true,
        id: appointmentId,
      });
    },
  ),

  // Get all appointments for a date (used by Schedules page)
  http.get('/api/v1/appointment', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const date = url.searchParams.get('date');

    let filteredAppointments = [...mockAppointments];
    if (date) {
      filteredAppointments = filteredAppointments.filter(
        (a) => a.date === date,
      );
    }

    // Sort by start time
    filteredAppointments.sort((a, b) => {
      if (!a.startTime || !b.startTime) return 0;
      return a.startTime.localeCompare(b.startTime);
    });

    const items = filteredAppointments.slice(skip, skip + take);

    return HttpResponse.json({
      items: items.map((item) => ({ item, id: item.id })),
      total: filteredAppointments.length,
      take,
      skip,
    });
  }),

  // ============ Student Class Assignment Endpoints ============

  // Get student class assignments
  http.get('/api/v1/student/:studentId/classes', ({ params }) => {
    const studentId = params['studentId'] as string;
    const student = mockStudents.find((s) => s.id === studentId);
    if (student) {
      const assignments = student.classAssignments || [];
      // Return in QueryResult format with enriched class details
      const items = assignments.map((a) => {
        // Find the class to get additional details
        const classInfo = mockClasses.find((c) => c.id === a.classId);
        return {
          id: a.id || `enrollment-${Date.now()}`,
          item: {
            classId: a.classId,
            studentId: studentId,
            status: a.status || 'Enrolled',
            enrolledAt: a.enrolledAt || new Date().toISOString(),
            className: classInfo?.name || a.className,
            classStatus: classInfo?.status || 'Active',
            classLevel: classInfo?.level || a.classLevel,
            classType: classInfo?.type || 'ESL',
            schedule: classInfo?.schedule || a.schedule,
            startTime: classInfo?.startTime || '09:00:00',
            endTime: classInfo?.endTime || '11:00:00',
          },
        };
      });
      return HttpResponse.json({
        items,
        total: items.length,
        take: items.length,
        skip: 0,
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Add class assignment
  http.post(
    '/api/v1/student/:studentId/classes',
    async ({ params, request }) => {
      const student = mockStudents.find((s) => s.id === params['studentId']);
      if (student) {
        const body = (await request.json()) as ClassAssignmentDto;
        const newAssignment: ClassAssignmentDto = {
          ...body,
          id: `class-assign-${Date.now()}`,
          studentId: params['studentId'] as string,
          enrolledAt: new Date(),
          status: 'Enrolled',
        };
        if (!student.classAssignments) student.classAssignments = [];
        student.classAssignments.push(newAssignment);
        return HttpResponse.json({
          success: true,
          message: 'Class assignment added successfully',
          id: newAssignment.id,
        });
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // Remove class assignment
  http.delete(
    '/api/v1/student/:studentId/classes/:assignmentId',
    ({ params }) => {
      const student = mockStudents.find((s) => s.id === params['studentId']);
      if (student && student.classAssignments) {
        const assignmentIndex = student.classAssignments.findIndex(
          (a) => a.id === params['assignmentId'],
        );
        if (assignmentIndex !== -1) {
          student.classAssignments.splice(assignmentIndex, 1);
          return HttpResponse.json({
            success: true,
            message: 'Class assignment removed successfully',
            id: params['assignmentId'],
          });
        }
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // ============ Student Test Results Endpoints ============

  // Get student test results
  http.get('/api/v1/student/:studentId/exams', ({ params }) => {
    const student = mockStudents.find((s) => s.id === params['studentId']);
    if (student) {
      // Add code field to exams for filtering
      const exams = (student.testResults || []).map((exam) => ({
        ...exam,
        code: exam.testType === 'BEST Test' ? 'BEST' : exam.testType,
      }));
      return HttpResponse.json(exams);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Add test result
  http.post('/api/v1/student/:studentId/exams', async ({ params, request }) => {
    const student = mockStudents.find((s) => s.id === params['studentId']);
    if (student) {
      const body = (await request.json()) as any;
      const studentId = params['studentId'] as string;

      // Handle new BEST score format with code
      let newTest: TestResultDto;
      if (body.code === 'BEST') {
        // Calculate level based on BEST Plus 2.0 scoring
        const score = body.score || 0;
        let level: number;
        if (score <= 35) {
          level = Math.ceil(score / 9) || 1;
        } else if (score <= 50) {
          level = 5 + Math.floor((score - 36) / 5);
        } else {
          level = 8;
        }

        // Determine improvement status
        let status: 'Improved' | 'Maintained' | 'Declined' = 'Maintained';
        if (student.testResults && student.testResults.length > 0) {
          const lastTest = student.testResults[student.testResults.length - 1];
          if (lastTest.rawScore !== undefined) {
            if (score > lastTest.rawScore) {
              status = 'Improved';
            } else if (score < lastTest.rawScore) {
              status = 'Declined';
            }
          }
        }

        newTest = {
          id: `test-${Date.now()}`,
          studentId,
          testType: 'BEST Test',
          testDate: new Date(body.examDate),
          rawScore: score,
          level,
          status,
        };
      } else {
        // Handle legacy format
        newTest = {
          ...body,
          id: `test-${Date.now()}`,
          studentId,
        };
      }

      if (!student.testResults) student.testResults = [];
      student.testResults.push(newTest);
      return HttpResponse.json({
        success: true,
        message: 'Test result added successfully',
        id: newTest.id,
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Update test result
  http.put(
    '/api/v1/student/:studentId/exams/:testId',
    async ({ params, request }) => {
      const student = mockStudents.find((s) => s.id === params['studentId']);
      if (student && student.testResults) {
        const testIndex = student.testResults.findIndex(
          (t) => t.id === params['testId'],
        );
        if (testIndex !== -1) {
          const body = (await request.json()) as TestResultDto;
          student.testResults[testIndex] = {
            ...student.testResults[testIndex],
            ...body,
          };
          return HttpResponse.json({
            success: true,
            message: 'Test result updated successfully',
            id: params['testId'],
          });
        }
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // Delete test result
  http.delete('/api/v1/student/:studentId/exams/:testId', ({ params }) => {
    const student = mockStudents.find((s) => s.id === params['studentId']);
    if (student && student.testResults) {
      const testIndex = student.testResults.findIndex(
        (t) => t.id === params['testId'],
      );
      if (testIndex !== -1) {
        student.testResults.splice(testIndex, 1);
        return HttpResponse.json({
          success: true,
          message: 'Test result deleted successfully',
          id: params['testId'],
        });
      }
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Class Endpoints ============

  // Get classes list
  http.get('/api/v1/class', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const statusFilter = url.searchParams.get('status');
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filteredClasses = [...mockClasses];

    // Filter by status
    if (statusFilter && statusFilter !== 'All') {
      filteredClasses = filteredClasses.filter(
        (c) => c.status === statusFilter,
      );
    }

    // Search by name
    if (search) {
      filteredClasses = filteredClasses.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.tutorName.toLowerCase().includes(search) ||
          c.coordinatorName.toLowerCase().includes(search),
      );
    }

    const paginatedItems = filteredClasses.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filteredClasses.length,
      take,
      skip,
    });
  }),

  // Get single class
  http.get('/api/v1/class/:id', ({ params }) => {
    const classItem = mockClasses.find((c) => c.id === params['id']);
    if (classItem) {
      return HttpResponse.json(classItem);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create class
  http.post('/api/v1/class', async ({ request }) => {
    const body = (await request.json()) as ClassDto;
    const newId = `class-${mockClasses.length + 1}`;
    const newClass: ClassDto & { id: string } = {
      ...body,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockClasses.push(newClass);
    return HttpResponse.json({
      success: true,
      message: 'Class created successfully',
      id: newId,
    });
  }),

  // Update class
  http.put('/api/v1/class/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<ClassDto>;
    const index = mockClasses.findIndex((c) => c.id === params['id']);
    if (index !== -1) {
      mockClasses[index] = {
        ...mockClasses[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Class updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete class
  http.delete('/api/v1/class/:id', ({ params }) => {
    const index = mockClasses.findIndex((c) => c.id === params['id']);
    if (index !== -1) {
      mockClasses.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Class deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Get class enrollments
  http.get('/api/v1/class/:classId/enrollments', ({ params }) => {
    const classItem = mockClasses.find((c) => c.id === params['classId']);
    if (classItem) {
      // Generate mock enrollments for this class
      const enrollments = Array.from(
        { length: classItem.enrolledCount },
        (_, i) => {
          const enrollment: ClassEnrollmentDto = {
            id: `enrollment-${params['classId']}-${i + 1}`,
            classId: params['classId'] as string,
            studentId: `student-${i + 1}`,
            studentName: faker.person.fullName(),
            enrolledAt: faker.date.past(),
            status: 'Enrolled',
          };
          return {
            item: enrollment,
            id: enrollment.id,
          };
        },
      );
      return HttpResponse.json({
        items: enrollments,
        total: enrollments.length,
        take: enrollments.length,
        skip: 0,
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Enroll student in class
  http.post(
    '/api/v1/class/:classId/enrollments',
    async ({ params, request }) => {
      const classItem = mockClasses.find((c) => c.id === params['classId']);
      if (classItem) {
        classItem.enrolledCount++;
        return HttpResponse.json({
          success: true,
          message: 'Student enrolled successfully',
          id: `enrollment-${Date.now()}`,
        });
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // ============ Class Attendance (Track) Endpoints ============

  // Get attendance records for a specific class and date
  http.get('/api/v1/class/:classId/track/:date', ({ params }) => {
    const classId = params['classId'] as string;
    const dateStr = params['date'] as string;
    const cls = mockClasses.find((c) => c.id === classId);
    if (!cls) {
      return new HttpResponse(null, { status: 404 });
    }

    // Create a synthetic sessionId for the date
    const sessionId = `session-${classId}-${dateStr}`;

    // Use enrolledCount to approximate roster size; fallback if missing
    const totalEnrolled = Math.max(cls.enrolledCount || 12, 8);
    const studentsForSession = faker.helpers.arrayElements(
      mockStudents,
      Math.min(totalEnrolled, mockStudents.length),
    );
    const statuses: AttendanceRecordDto['status'][] = [
      'Present',
      'Absent',
      'Excused',
      'Unmarked',
    ];

    const records: AttendanceRecordDto[] = studentsForSession.map((s) => {
      const status = faker.helpers.arrayElement(statuses);
      return {
        id: `att-${sessionId}-${s.id}`,
        sessionId,
        classId,
        studentId: s.id,
        studentName: `${s.firstName} ${s.lastName}`,
        status,
        notes: faker.datatype.boolean({ probability: 0.15 })
          ? faker.lorem.words(6)
          : undefined,
        markedAt: status === 'Unmarked' ? undefined : faker.date.recent(),
        markedBy: status === 'Unmarked' ? undefined : faker.person.fullName(),
        lastAttendedAt:
          status === 'Present'
            ? `${faker.number.int({ min: 0, max: 14 })}d ago`
            : undefined,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      };
    });

    // Return either raw array or QueryResult-like shape; the UI supports both.
    return HttpResponse.json(records.map((r) => ({ id: r.id!, item: r })));
  }),

  // Track attendance for a student in a class on a specific date
  http.post('/api/v1/class/:classId/track', async ({ params, request }) => {
    const classId = params['classId'] as string;
    const body = (await request.json()) as {
      studentId: string;
      date: string;
      status: AttendanceRecordDto['status'];
    };
    // Accept and return success; persistence is not required for mock
    return HttpResponse.json({
      success: true,
      message: `Attendance updated to ${body.status}`,
      id: `${classId}-${body.studentId}-${body.date}`,
    });
  }),

  // Remove enrollment
  http.delete(
    '/api/v1/class/:classId/enrollments/:enrollmentId',
    ({ params }) => {
      const classItem = mockClasses.find((c) => c.id === params['classId']);
      if (classItem && classItem.enrolledCount > 0) {
        classItem.enrolledCount--;
        return HttpResponse.json({
          success: true,
          message: 'Enrollment removed successfully',
          id: params['enrollmentId'],
        });
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // ============ Admin - Vehicles Endpoints ============

  // Get vehicles list
  http.get('/api/v1/admin/vehicles', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filtered = [...mockVehicles];

    if (search) {
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(search) ||
          v.licensePlate.toLowerCase().includes(search) ||
          v.driverName?.toLowerCase().includes(search),
      );
    }

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single vehicle
  http.get('/api/v1/admin/vehicles/:id', ({ params }) => {
    const vehicle = mockVehicles.find((v) => v.id === params['id']);
    if (vehicle) {
      return HttpResponse.json(vehicle);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create vehicle
  http.post('/api/v1/admin/vehicles', async ({ request }) => {
    const body = (await request.json()) as VehicleDto;
    const newId = `vehicle-${mockVehicles.length + 1}`;
    const newVehicle: VehicleDto & { id: string } = {
      ...body,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockVehicles.push(newVehicle);
    return HttpResponse.json({
      success: true,
      message: 'Vehicle created successfully',
      id: newId,
    });
  }),

  // Update vehicle
  http.put('/api/v1/admin/vehicles/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<VehicleDto>;
    const index = mockVehicles.findIndex((v) => v.id === params['id']);
    if (index !== -1) {
      mockVehicles[index] = {
        ...mockVehicles[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Vehicle updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete vehicle
  http.delete('/api/v1/admin/vehicles/:id', ({ params }) => {
    const index = mockVehicles.findIndex((v) => v.id === params['id']);
    if (index !== -1) {
      mockVehicles.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Vehicle deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Admin - Exam Types Endpoints ============

  // Get exam types list
  http.get('/api/v1/admin/exam-types', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filtered = [...mockExamTypes];

    if (search) {
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(search) ||
          e.code.toLowerCase().includes(search),
      );
    }

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single exam type
  http.get('/api/v1/admin/exam-types/:id', ({ params }) => {
    const examType = mockExamTypes.find((e) => e.id === params['id']);
    if (examType) {
      return HttpResponse.json(examType);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create exam type
  http.post('/api/v1/admin/exam-types', async ({ request }) => {
    const body = (await request.json()) as ExamTypeDto;
    const newId = `exam-type-${mockExamTypes.length + 1}`;
    const newExamType: ExamTypeDto & { id: string } = {
      ...body,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockExamTypes.push(newExamType);
    return HttpResponse.json({
      success: true,
      message: 'Exam type created successfully',
      id: newId,
    });
  }),

  // Update exam type
  http.put('/api/v1/admin/exam-types/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<ExamTypeDto>;
    const index = mockExamTypes.findIndex((e) => e.id === params['id']);
    if (index !== -1) {
      mockExamTypes[index] = {
        ...mockExamTypes[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Exam type updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete exam type
  http.delete('/api/v1/admin/exam-types/:id', ({ params }) => {
    const index = mockExamTypes.findIndex((e) => e.id === params['id']);
    if (index !== -1) {
      mockExamTypes.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Exam type deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Admin - Locations Endpoints ============

  // Get locations list
  http.get('/api/v1/admin/locations', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filtered = [...mockLocations];

    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(search) ||
          l.code.toLowerCase().includes(search) ||
          l.city.toLowerCase().includes(search),
      );
    }

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single location
  http.get('/api/v1/admin/locations/:id', ({ params }) => {
    const location = mockLocations.find((l) => l.id === params['id']);
    if (location) {
      return HttpResponse.json(location);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create location
  http.post('/api/v1/admin/locations', async ({ request }) => {
    const body = (await request.json()) as LocationDto & {
      hasChildcare?: boolean;
    };
    const newId = `location-${mockLocations.length + 1}`;
    const newLocation: LocationDto & { id: string; hasChildcare: boolean } = {
      ...body,
      id: newId,
      hasChildcare: body.hasChildcare ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockLocations.push(newLocation);
    return HttpResponse.json({
      success: true,
      message: 'Location created successfully',
      id: newId,
    });
  }),

  // Update location
  http.put('/api/v1/admin/locations/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<LocationDto>;
    const index = mockLocations.findIndex((l) => l.id === params['id']);
    if (index !== -1) {
      mockLocations[index] = {
        ...mockLocations[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Location updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete location
  http.delete('/api/v1/admin/locations/:id', ({ params }) => {
    const index = mockLocations.findIndex((l) => l.id === params['id']);
    if (index !== -1) {
      mockLocations.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Location deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Admin - Volunteers Endpoints ============

  // Get volunteers list
  http.get('/api/v1/admin/volunteers', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filtered = [...mockVolunteers];

    if (search) {
      filtered = filtered.filter(
        (v) =>
          v.firstName.toLowerCase().includes(search) ||
          v.lastName.toLowerCase().includes(search) ||
          v.email.toLowerCase().includes(search),
      );
    }

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single volunteer
  http.get('/api/v1/admin/volunteers/:id', ({ params }) => {
    const volunteer = mockVolunteers.find((v) => v.id === params['id']);
    if (volunteer) {
      return HttpResponse.json(volunteer);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create volunteer
  http.post('/api/v1/admin/volunteers', async ({ request }) => {
    const body = (await request.json()) as VolunteerDto;
    const newId = `volunteer-${mockVolunteers.length + 1}`;
    const newVolunteer: VolunteerDto & { id: string } = {
      ...body,
      id: newId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockVolunteers.push(newVolunteer);
    return HttpResponse.json({
      success: true,
      message: 'Volunteer created successfully',
      id: newId,
    });
  }),

  // Update volunteer
  http.put('/api/v1/admin/volunteers/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<VolunteerDto>;
    const index = mockVolunteers.findIndex((v) => v.id === params['id']);
    if (index !== -1) {
      mockVolunteers[index] = {
        ...mockVolunteers[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Volunteer updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete volunteer
  http.delete('/api/v1/admin/volunteers/:id', ({ params }) => {
    const index = mockVolunteers.findIndex((v) => v.id === params['id']);
    if (index !== -1) {
      mockVolunteers.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Volunteer deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Queue Endpoints ============

  // Get queue users for dropdown
  http.get('/api/v1/queue/users', () => {
    return HttpResponse.json(mockQueueUsers);
  }),

  // Get queue items with optional user filter
  http.get('/api/v1/queue', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const userId = url.searchParams.get('userId');
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filtered = [...mockQueueItems];

    // Filter by user if not "all"
    if (userId && userId !== 'all') {
      filtered = filtered.filter((item) => item.assignedTo === userId);
    }

    // Filter by search term
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.description?.toLowerCase().includes(search) ||
          item.relatedEntityName?.toLowerCase().includes(search),
      );
    }

    // Sort by priority and due date
    const priorityOrder: Record<string, number> = {
      Urgent: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    filtered.sort((a, b) => {
      // Active items first
      const statusOrder: Record<string, number> = {
        New: 0,
        'In Progress': 1,
        Waiting: 2,
        Completed: 3,
        Cancelled: 4,
      };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by priority
      const priorityDiff =
        priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single queue item
  http.get('/api/v1/queue/:id', ({ params }) => {
    const item = mockQueueItems.find((i) => i.id === params['id']);
    if (item) {
      return HttpResponse.json(item);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create queue item
  http.post('/api/v1/queue', async ({ request }) => {
    const body = (await request.json()) as QueueItemDto;
    const newId = `queue-${mockQueueItems.length + 1}`;
    const assignee = mockQueueUsers.find((u) => u.id === body.assignedTo);
    const newItem: QueueItemDto & { id: string } = {
      ...body,
      id: newId,
      assignedToName: assignee?.name || body.assignedToName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockQueueItems.push(newItem);
    return HttpResponse.json({
      success: true,
      message: 'Queue item created successfully',
      id: newId,
    });
  }),

  // Update queue item
  http.put('/api/v1/queue/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<QueueItemDto>;
    const index = mockQueueItems.findIndex((i) => i.id === params['id']);
    if (index !== -1) {
      if (body.assignedTo) {
        const assignee = mockQueueUsers.find((u) => u.id === body.assignedTo);
        body.assignedToName = assignee?.name;
      }
      mockQueueItems[index] = {
        ...mockQueueItems[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Queue item updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Complete queue item
  http.put('/api/v1/queue/:id/complete', ({ params }) => {
    const index = mockQueueItems.findIndex((i) => i.id === params['id']);
    if (index !== -1) {
      mockQueueItems[index] = {
        ...mockQueueItems[index],
        status: 'Completed',
        completedDate: new Date(),
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Queue item completed',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete queue item
  http.delete('/api/v1/queue/:id', ({ params }) => {
    const index = mockQueueItems.findIndex((i) => i.id === params['id']);
    if (index !== -1) {
      mockQueueItems.splice(index, 1);
      return HttpResponse.json({
        success: true,
        message: 'Queue item deleted successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Exam Endpoints ============

  // Get exam stats
  http.get('/api/v1/exam/stats', () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const dueThisMonth = mockStudentExamSummaries.filter((s) => {
      if (!s.nextExamDate) return false;
      const d = new Date(s.nextExamDate);
      return d >= startOfMonth && d <= endOfMonth;
    }).length;

    const levelProgressions = mockExamRecords.filter(
      (e) => e.levelBefore !== e.levelAfter,
    ).length;

    const stats: ExamStatsDto = {
      studentsAssessed: mockStudentExamSummaries.length,
      dueThisMonth,
      levelProgressions,
      totalExamsGiven: mockExamRecords.length,
    };

    return HttpResponse.json(stats);
  }),

  // Get scheduled and recent exams
  http.get('/api/v1/exam/schedule', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();
    const status = url.searchParams.get('status');

    const now = new Date();
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);

    let filtered = mockExamRecords.filter((e) => {
      // If status is provided, we might want to be more lenient with dates
      // or just filter primarily by status.
      // But for "Recent & Upcoming", we usually want a window.
      // Let's allow a wider window for "Completed" so the user can actually see history.
      const d = new Date(e.examDate);
      if (status === 'Completed') {
        const lastMonth = new Date(now);
        lastMonth.setMonth(now.getMonth() - 1);
        return d >= lastMonth && d <= now;
      }
      return d >= lastWeek && d <= nextWeek;
    });

    if (status) {
      filtered = filtered.filter((e) => e.status === status);
    }

    if (search) {
      filtered = filtered.filter((e) =>
        e.studentName.toLowerCase().includes(search),
      );
    }

    // Sort by date ascending
    filtered.sort(
      (a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime(),
    );

    const paginated = filtered.slice(skip, skip + take);

    return HttpResponse.json({
      items: paginated.map((item) => ({ item, id: item.id })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get student exam summaries
  http.get('/api/v1/exam/students', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();
    const dueSoon = url.searchParams.get('dueSoon') === 'true';
    const sortBy = url.searchParams.get('sortBy') || 'name';

    let filtered = [...mockStudentExamSummaries];

    // Filter by search
    if (search) {
      filtered = filtered.filter(
        (s) =>
          s.studentName.toLowerCase().includes(search) ||
          s.coordinatorName?.toLowerCase().includes(search),
      );
    }

    // Filter by due soon (within 14 days)
    if (dueSoon) {
      const twoWeeksFromNow = new Date();
      twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
      filtered = filtered.filter((s) => {
        if (!s.nextExamDate) return false;
        return new Date(s.nextExamDate) <= twoWeeksFromNow;
      });
    }

    // Sort
    if (sortBy === 'soonest') {
      filtered.sort((a, b) => {
        if (!a.nextExamDate && !b.nextExamDate) return 0;
        if (!a.nextExamDate) return 1;
        if (!b.nextExamDate) return -1;
        return (
          new Date(a.nextExamDate).getTime() -
          new Date(b.nextExamDate).getTime()
        );
      });
    } else {
      filtered.sort((a, b) => a.studentName.localeCompare(b.studentName));
    }

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get student exam history
  http.get('/api/v1/exam/students/:studentId/history', ({ params }) => {
    const studentId = params['studentId'] as string;
    const records = mockExamRecords.filter((e) => e.studentId === studentId);
    // Sort by date descending
    records.sort(
      (a, b) => new Date(b.examDate).getTime() - new Date(a.examDate).getTime(),
    );
    return HttpResponse.json(records);
  }),

  // Get single exam record
  http.get('/api/v1/exam/:id', ({ params }) => {
    const record = mockExamRecords.find((e) => e.id === params['id']);
    if (record) {
      return HttpResponse.json(record);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Schedule exam
  http.post('/api/v1/exam/schedule', async ({ request }) => {
    const body = (await request.json()) as any;
    const newId = `exam-${Date.now()}`;
    const student = mockStudentExamSummaries.find(
      (s) => s.studentId === body.studentId,
    );
    const examType = mockExamTypes.find((e) => e.id === body.examTypeId);

    const newRecord: ExamRecordDto & { id: string } = {
      id: newId,
      studentId: body.studentId,
      studentName: student?.studentName || 'Unknown',
      examTypeId: body.examTypeId,
      examTypeName: examType?.name || 'Unknown',
      examDate: new Date(body.examDate),
      scheduledTime: body.scheduledTime,
      status: 'Scheduled',
      notes: body.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockExamRecords.push(newRecord);

    // Update student summary
    const summaryIndex = mockStudentExamSummaries.findIndex(
      (s) => s.studentId === body.studentId,
    );
    if (summaryIndex !== -1) {
      mockStudentExamSummaries[summaryIndex].nextExamDate = new Date(
        body.examDate,
      );
      mockStudentExamSummaries[summaryIndex].nextExamType = examType?.name;
    }

    return HttpResponse.json({
      success: true,
      message: 'Exam scheduled successfully',
      id: newId,
    });
  }),

  // Update exam record
  http.put('/api/v1/exam/schedule/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<ExamRecordDto>;
    const index = mockExamRecords.findIndex((e) => e.id === params['id']);
    if (index !== -1) {
      mockExamRecords[index] = {
        ...mockExamRecords[index],
        ...body,
        updatedAt: new Date(),
      };
      return HttpResponse.json({
        success: true,
        message: 'Exam record updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Cancel exam
  http.delete('/api/v1/exam/:id', ({ params }) => {
    const index = mockExamRecords.findIndex((e) => e.id === params['id']);
    if (index !== -1) {
      mockExamRecords[index].status = 'Cancelled';
      return HttpResponse.json({
        success: true,
        message: 'Exam cancelled successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Goals Endpoints ============

  // Get goals list
  http.get('/api/v1/goals', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const search = url.searchParams.get('filter')?.toLowerCase();

    let filtered = [...mockGoals];

    if (search) {
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          g.description?.toLowerCase().includes(search) ||
          g.category.toLowerCase().includes(search),
      );
    }

    // Sort by sortOrder
    filtered.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single goal
  http.get('/api/v1/goals/:id', ({ params }) => {
    const goal = mockGoals.find((g) => g.id === params['id']);
    if (goal) {
      return HttpResponse.json({
        id: goal.id,
        item: goal,
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Get goal levels
  http.get('/api/v1/goals/:goalId/levels', ({ params }) => {
    const goal = mockGoals.find((g) => g.id === params['goalId']);
    if (goal) {
      return HttpResponse.json(goal.levels || []);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // ============ Student Goals Endpoints ============

  // Get student goals by student ID
  http.get('/api/v1/student/:studentId/goals', ({ params }) => {
    const studentId = params['studentId'] as string;
    const studentGoalsForStudent = mockStudentGoals.filter(
      (sg) => sg.studentId === studentId,
    );

    // Return in the wrapped format expected by the service
    return HttpResponse.json({
      studentId,
      goals: studentGoalsForStudent,
      total: studentGoalsForStudent.length,
    });
  }),

  // Get student goal levels (for checklist display)
  http.get('/api/v1/student/:studentId/goals/:goalId/levels', ({ params }) => {
    const studentId = params['studentId'] as string;
    const goalId = params['goalId'] as string;
    const key = `${studentId}-${goalId}`;

    const levels = mockStudentGoalLevelStatuses.get(key);
    if (levels) {
      return HttpResponse.json(levels);
    }

    // Return empty array if no levels found
    return HttpResponse.json([]);
  }),

  // Update student goals (set which goals a student has)
  http.put('/api/v1/student/:studentId/goals', async ({ params, request }) => {
    const studentId = params['studentId'] as string;
    const body = (await request.json()) as { goalIds: string[] };

    // Remove existing goals for this student
    mockStudentGoals = mockStudentGoals.filter(
      (sg) => sg.studentId !== studentId,
    );

    // Add new goals
    body.goalIds.forEach((goalId, index) => {
      const goal = mockGoals.find((g) => g.id === goalId);
      if (goal) {
        mockStudentGoals.push({
          id: `student-goal-${studentId}-${goalId}`,
          studentId,
          goalId,
          currentLevel: 0,
          status: 'active',
          priority: index + 1,
          startedAt: new Date(),
          goal,
          goalName: goal.name,
          goalCategory: goal.category,
        });
      }
    });

    // Regenerate level statuses and pipelines
    mockStudentGoalLevelStatuses = generateStudentGoalLevelStatuses();
    mockStudentPipelines = generateStudentPipelines();

    return HttpResponse.json({
      success: true,
      message: 'Student goals updated successfully',
      id: studentId,
    });
  }),

  // Update student goal level completion
  http.put(
    '/api/v1/student/:studentId/goals/:goalId/levels',
    async ({ params, request }) => {
      const studentId = params['studentId'] as string;
      const goalId = params['goalId'] as string;
      const body = (await request.json()) as { name: string; value: boolean }[];
      const key = `${studentId}-${goalId}`;

      // Update the level statuses
      const levels = mockStudentGoalLevelStatuses.get(key);
      if (levels) {
        body.forEach((update) => {
          const level = levels.find((l) => l.levelName === update.name);
          if (level) {
            level.complete = update.value;
          }
        });
        mockStudentGoalLevelStatuses.set(key, levels);

        // Update the student goal's current level
        const studentGoal = mockStudentGoals.find(
          (sg) => sg.studentId === studentId && sg.goalId === goalId,
        );
        if (studentGoal) {
          const completedLevels = levels.filter((l) => l.complete).length;
          studentGoal.currentLevel = completedLevels;
        }
      }

      return HttpResponse.json({
        success: true,
        message: 'Goal levels updated successfully',
      });
    },
  ),

  // Get student pipeline
  http.get('/api/v1/student/:studentId/pipeline', ({ params }) => {
    const studentId = params['studentId'] as string;
    const pipelines = mockStudentPipelines.get(studentId) || [];

    return HttpResponse.json({
      studentId,
      pipelines,
    });
  }),

  // Update student goal pipeline stages
  http.put(
    '/api/v1/student/:studentId/goals/:goalId/pipeline',
    async ({ params, request }) => {
      const studentId = params['studentId'] as string;
      const goalId = params['goalId'] as string;
      const body = (await request.json()) as {
        name: string;
        completed: boolean;
      }[];

      const pipelines = mockStudentPipelines.get(studentId);
      if (pipelines) {
        const goalPipeline = pipelines.find((p) => p.goalId === goalId);
        if (goalPipeline) {
          body.forEach((update) => {
            const stage = goalPipeline.pipeline.find(
              (s) => s.name === update.name,
            );
            if (stage) {
              stage.completed = update.completed;
            }
          });
        }
      }

      return HttpResponse.json({
        success: true,
        message: 'Goal pipeline updated successfully',
      });
    },
  ),

  // ============ Student Goals CRUD ============

  // Get all student goals (admin view)
  http.get('/api/v1/student-goals', ({ request }) => {
    const url = new URL(request.url);
    const { take, skip } = parseQueryParams(url);
    const studentId = url.searchParams.get('studentId');

    let filtered = [...mockStudentGoals];

    if (studentId) {
      filtered = filtered.filter((sg) => sg.studentId === studentId);
    }

    const paginatedItems = filtered.slice(skip, skip + take);
    return HttpResponse.json({
      items: paginatedItems.map((item) => ({ id: item.id, item })),
      total: filtered.length,
      take,
      skip,
    });
  }),

  // Get single student goal
  http.get('/api/v1/student-goals/:id', ({ params }) => {
    const studentGoal = mockStudentGoals.find((sg) => sg.id === params['id']);
    if (studentGoal) {
      return HttpResponse.json(studentGoal);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Create student goal
  http.post('/api/v1/student-goals', async ({ request }) => {
    const body = (await request.json()) as StudentGoalDto;
    const newId = `student-goal-${Date.now()}`;
    const goal = mockGoals.find((g) => g.id === body.goalId);

    const newStudentGoal: StudentGoalDto & { id: string } = {
      ...body,
      id: newId,
      goal,
      goalName: goal?.name,
      goalCategory: goal?.category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockStudentGoals.push(newStudentGoal);

    // Regenerate level statuses and pipelines
    mockStudentGoalLevelStatuses = generateStudentGoalLevelStatuses();
    mockStudentPipelines = generateStudentPipelines();

    return HttpResponse.json({
      success: true,
      message: 'Student goal added successfully',
      id: newId,
    });
  }),

  // Update student goal
  http.put('/api/v1/student-goals/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<StudentGoalDto>;
    const index = mockStudentGoals.findIndex((sg) => sg.id === params['id']);

    if (index !== -1) {
      mockStudentGoals[index] = {
        ...mockStudentGoals[index],
        ...body,
        updatedAt: new Date(),
      };

      return HttpResponse.json({
        success: true,
        message: 'Student goal updated successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Delete student goal
  http.delete('/api/v1/student-goals/:id', ({ params }) => {
    const index = mockStudentGoals.findIndex((sg) => sg.id === params['id']);
    if (index !== -1) {
      const removed = mockStudentGoals.splice(index, 1)[0];

      // Clean up level statuses
      const key = `${removed.studentId}-${removed.goalId}`;
      mockStudentGoalLevelStatuses.delete(key);

      // Regenerate pipelines
      mockStudentPipelines = generateStudentPipelines();

      return HttpResponse.json({
        success: true,
        message: 'Student goal removed successfully',
        id: params['id'],
      });
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Advance student goal level
  http.post(
    '/api/v1/student-goals/:id/advance',
    async ({ params, request }) => {
      const body = (await request.json()) as {
        newLevel: number;
        notes?: string;
      };
      const studentGoal = mockStudentGoals.find((sg) => sg.id === params['id']);

      if (studentGoal) {
        studentGoal.currentLevel = body.newLevel;
        studentGoal.notes = body.notes || studentGoal.notes;
        studentGoal.updatedAt = new Date();

        // Check if completed
        const goal = mockGoals.find((g) => g.id === studentGoal.goalId);
        if (goal && body.newLevel >= (goal.levels?.length || 0)) {
          studentGoal.status = 'completed';
          studentGoal.completedAt = new Date();
        }

        // Update level statuses
        const key = `${studentGoal.studentId}-${studentGoal.goalId}`;
        const levels = mockStudentGoalLevelStatuses.get(key);
        if (levels) {
          levels.forEach((level, index) => {
            level.complete = index < body.newLevel;
          });
        }

        return HttpResponse.json({
          success: true,
          message: 'Student advanced to next level',
          id: params['id'],
        });
      }
      return new HttpResponse(null, { status: 404 });
    },
  ),

  // ========== DASHBOARD ENDPOINTS ==========

  // Dashboard Summary
  http.get('/api/v1/dashboard/summary', () => {
    const activeStudents = mockStudents.filter(
      (s) => s.status === 'Active',
    ).length;
    const activeClasses = mockClasses.filter(
      (c) => c.status === 'Active',
    ).length;
    const openTasks = mockQueueItems.filter(
      (q) => q.status !== 'Completed' && q.status !== 'Cancelled',
    ).length;
    const overdueTasks = mockQueueItems.filter(
      (q) =>
        q.status !== 'Completed' &&
        q.status !== 'Cancelled' &&
        q.dueDate &&
        new Date(q.dueDate) < new Date(),
    ).length;

    return HttpResponse.json({
      activeStudents,
      newRegistrations: faker.number.int({ min: 10, max: 30 }),
      attendanceRate: faker.number.float({
        min: 78,
        max: 92,
        fractionDigits: 1,
      }),
      activeClasses,
      goalsCompleted: faker.number.int({ min: 15, max: 45 }),
      examsPassed: faker.number.int({ min: 20, max: 40 }),
      childrenInChildcare: faker.number.int({ min: 25, max: 45 }),
      studentsTransported: mockStudents.filter((s) => s.needsTransportation)
        .length,
      openTasks,
      overdueTasks,
    });
  }),

  // Dashboard Student Metrics
  http.get('/api/v1/dashboard/students', () => {
    const activeStudents = mockStudents.filter((s) => s.status === 'Active');

    // Status breakdown
    const statusBreakdown = ['Active', 'Inactive', 'Graduated', 'Dropped'].map(
      (status) => ({
        status,
        count:
          mockStudents.filter((s) => s.status === status).length ||
          faker.number.int({ min: 0, max: 10 }),
      }),
    );

    // Program breakdown
    const programBreakdown = ['ELL', 'ADS', 'BOTH'].map((program) => ({
      program,
      count: activeStudents.filter((s) => s.program === program).length,
    }));

    // Level breakdown
    const levelBreakdown = ['Beginner', 'Intermediate', 'Advanced'].map(
      (level) => ({
        level,
        count: activeStudents.filter((s) => s.level === level).length,
      }),
    );

    // Funnel stages
    const funnelStages = [
      'Inquiry',
      'Needs BEST',
      'Tested',
      'Ready to Place',
      'Placed',
      'Completed',
    ].map((funnelStage) => ({
      funnelStage,
      count: faker.number.int({ min: 5, max: 25 }),
    }));

    const needsTransportation = activeStudents.filter(
      (s) => s.needsTransportation,
    ).length;
    const needsChildcare = activeStudents.filter(
      (s) => s.needsChildCare,
    ).length;

    return HttpResponse.json({
      totalActive: activeStudents.length,
      newRegistrations: faker.number.int({ min: 10, max: 25 }),
      statusBreakdown,
      programBreakdown,
      levelBreakdown,
      funnelStages,
      servicesNeeded: {
        needsTransportation,
        needsChildcare,
        needsBoth: faker.number.int({
          min: 3,
          max: Math.min(needsTransportation, needsChildcare),
        }),
      },
      agreements: {
        signed: faker.number.int({ min: 35, max: 45 }),
        unsigned: faker.number.int({ min: 2, max: 8 }),
        signedPercentage: faker.number.float({
          min: 85,
          max: 95,
          fractionDigits: 1,
        }),
      },
    });
  }),

  // Dashboard Attendance Metrics
  http.get('/api/v1/dashboard/attendance', () => {
    const total = faker.number.int({ min: 800, max: 1200 });
    const attended = Math.floor(
      total * faker.number.float({ min: 0.78, max: 0.92 }),
    );

    // Generate weekly trend data for last 8 weeks
    const trend = Array.from({ length: 8 }, (_, i) => {
      const weekDate = new Date();
      weekDate.setDate(weekDate.getDate() - (7 - i) * 7);
      const weekTotal = faker.number.int({ min: 100, max: 150 });
      const weekAttended = Math.floor(
        weekTotal * faker.number.float({ min: 0.75, max: 0.95 }),
      );
      return {
        period: weekDate.toISOString().split('T')[0],
        attended: weekAttended,
        total: weekTotal,
        attendanceRate: Math.round((weekAttended / weekTotal) * 1000) / 10,
      };
    });

    // By class attendance
    const byClass = mockClasses
      .filter((c) => c.status === 'Active')
      .map((c) => {
        const classTotal = faker.number.int({ min: 20, max: 50 });
        const classAttended = Math.floor(
          classTotal * faker.number.float({ min: 0.7, max: 0.98 }),
        );
        return {
          classId: c.id,
          className: c.name,
          attended: classAttended,
          total: classTotal,
          attendanceRate: Math.round((classAttended / classTotal) * 1000) / 10,
        };
      })
      .sort((a, b) => a.attendanceRate - b.attendanceRate);

    // Low attendance students
    const lowAttendanceStudents = mockStudents
      .filter((s) => s.status === 'Active')
      .slice(0, 5)
      .map((s) => {
        const studentTotal = faker.number.int({ min: 8, max: 15 });
        const studentAttended = Math.floor(
          studentTotal * faker.number.float({ min: 0.4, max: 0.69 }),
        );
        return {
          studentId: s.id,
          studentName: s.displayName || `${s.firstName} ${s.lastName}`,
          attended: studentAttended,
          total: studentTotal,
          attendanceRate:
            Math.round((studentAttended / studentTotal) * 1000) / 10,
        };
      });

    return HttpResponse.json({
      overview: {
        attended,
        total,
        attendanceRate: Math.round((attended / total) * 1000) / 10,
      },
      byStatus: [
        {
          status: 'Present',
          count: attended,
          percentage: faker.number.float({
            min: 75,
            max: 85,
            fractionDigits: 1,
          }),
        },
        {
          status: 'Absent',
          count: Math.floor((total - attended) * 0.7),
          percentage: faker.number.float({
            min: 8,
            max: 15,
            fractionDigits: 1,
          }),
        },
        {
          status: 'Excused',
          count: Math.floor((total - attended) * 0.3),
          percentage: faker.number.float({ min: 3, max: 8, fractionDigits: 1 }),
        },
      ],
      trend,
      byClass,
      lowAttendanceStudents,
    });
  }),

  // Dashboard Class Metrics
  http.get('/api/v1/dashboard/classes', () => {
    const byStatus = ['Active', 'Upcoming', 'Completed', 'Cancelled'].map(
      (status) => ({
        status,
        count:
          mockClasses.filter((c) => c.status === status).length ||
          faker.number.int({ min: 0, max: 3 }),
      }),
    );

    const enrollmentSummary = mockClasses
      .filter((c) => c.status === 'Active')
      .map((c) => ({
        classId: c.id,
        className: c.name,
        maxCapacity: c.maxCapacity,
        enrolledCount: c.enrolledCount,
        availableSpots: c.maxCapacity - c.enrolledCount,
        fillRate: Math.round((c.enrolledCount / c.maxCapacity) * 1000) / 10,
      }))
      .sort((a, b) => b.fillRate - a.fillRate);

    const byType = ['ESL', 'Citizenship', 'GED', 'Conversation', 'Other'].map(
      (type) => ({
        type,
        count: mockClasses.filter(
          (c) => c.type === type && c.status === 'Active',
        ).length,
      }),
    );

    const byLocation = [
      'Downtown Center',
      'North Branch',
      'South Library',
      'Community Center',
      'Main Campus',
    ].map((locationName) => ({
      locationId: `loc-${locationName.toLowerCase().replace(/\s+/g, '-')}`,
      locationName,
      classCount: mockClasses.filter(
        (c) => c.location === locationName && c.status === 'Active',
      ).length,
    }));

    return HttpResponse.json({
      byStatus,
      enrollmentSummary,
      byType,
      byLocation,
      sessionsHeld: faker.number.int({ min: 80, max: 150 }),
      newEnrollments: faker.number.int({ min: 15, max: 40 }),
    });
  }),

  // Dashboard Goals Metrics
  http.get('/api/v1/dashboard/goals', () => {
    const activeGoals = [
      {
        goalName: 'Learn English',
        category: 'Language',
        studentCount: faker.number.int({ min: 25, max: 50 }),
      },
      {
        goalName: 'GED Preparation',
        category: 'Education',
        studentCount: faker.number.int({ min: 15, max: 35 }),
      },
      {
        goalName: 'Citizenship',
        category: 'Legal',
        studentCount: faker.number.int({ min: 20, max: 40 }),
      },
      {
        goalName: 'Computer Skills',
        category: 'Technology',
        studentCount: faker.number.int({ min: 10, max: 25 }),
      },
      {
        goalName: 'Job Skills',
        category: 'Employment',
        studentCount: faker.number.int({ min: 8, max: 20 }),
      },
      {
        goalName: 'Drivers License',
        category: 'Life Skills',
        studentCount: faker.number.int({ min: 5, max: 15 }),
      },
    ];

    const avgHoursByGoal = activeGoals.map((g) => ({
      goalName: g.goalName,
      avgHoursToComplete: faker.number.float({
        min: 40,
        max: 200,
        fractionDigits: 1,
      }),
    }));

    return HttpResponse.json({
      activeGoals,
      completion: {
        goalsCompleted: faker.number.int({ min: 20, max: 50 }),
        levelAdvancements: faker.number.int({ min: 40, max: 80 }),
        uniqueStudentGoals: faker.number.int({ min: 30, max: 60 }),
        certificatesIssued: faker.number.int({ min: 10, max: 25 }),
      },
      pipelineStages: [
        {
          stageName: 'Assessment',
          count: faker.number.int({ min: 10, max: 25 }),
        },
        {
          stageName: 'In Progress',
          count: faker.number.int({ min: 30, max: 60 }),
        },
        { stageName: 'Testing', count: faker.number.int({ min: 5, max: 15 }) },
        {
          stageName: 'Complete',
          count: faker.number.int({ min: 15, max: 35 }),
        },
      ],
      avgHoursByGoal,
    });
  }),

  // Dashboard Task Metrics
  http.get('/api/v1/dashboard/tasks', () => {
    const byStatus = [
      'New',
      'In Progress',
      'Waiting',
      'Completed',
      'Cancelled',
    ].map((status) => ({
      status,
      count: mockQueueItems.filter((q) => q.status === status).length,
    }));

    const byPriority = ['Urgent', 'High', 'Medium', 'Low'].map((priority) => ({
      priority,
      count: mockQueueItems.filter(
        (q) =>
          q.priority === priority &&
          q.status !== 'Completed' &&
          q.status !== 'Cancelled',
      ).length,
    }));

    const overdueTasks = mockQueueItems.filter(
      (q) =>
        q.status !== 'Completed' &&
        q.status !== 'Cancelled' &&
        q.dueDate &&
        new Date(q.dueDate) < new Date(),
    ).length;

    const tasksCompleted = mockQueueItems.filter(
      (q) => q.status === 'Completed',
    ).length;

    // Group by assignee
    const assigneeMap = new Map<string, { open: number; completed: number }>();
    mockQueueItems.forEach((q) => {
      const assigneeId = q.assignedTo || 'unassigned';
      if (!assigneeMap.has(assigneeId)) {
        assigneeMap.set(assigneeId, { open: 0, completed: 0 });
      }
      const data = assigneeMap.get(assigneeId)!;
      if (q.status === 'Completed') {
        data.completed++;
      } else if (q.status !== 'Cancelled') {
        data.open++;
      }
    });

    const byAssignee = Array.from(assigneeMap.entries())
      .filter(([id]) => id !== 'unassigned')
      .map(([userId, data]) => {
        const user = mockUsers.find((u) => u.id === userId);
        return {
          userId,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          openTasks: data.open,
          completedTasks: data.completed,
        };
      })
      .sort((a, b) => b.openTasks - a.openTasks);

    return HttpResponse.json({
      byStatus,
      byPriority,
      overdueTasks,
      tasksCompleted,
      byAssignee,
    });
  }),

  // Dashboard Transportation Metrics (hardcoded - real data comes from backend)
  http.get('/api/v1/dashboard/transportation', () => {
    return HttpResponse.json({
      activeRoutes: 6,
      totalCapacity: 72,
      studentsTransported: 45,
      routeUtilization: [
        {
          routeId: 'route-1',
          routeName: 'North Route',
          capacity: 12,
          assignedStudents: 10,
          utilizationRate: 83.3,
        },
        {
          routeId: 'route-2',
          routeName: 'South Route',
          capacity: 12,
          assignedStudents: 9,
          utilizationRate: 75.0,
        },
        {
          routeId: 'route-3',
          routeName: 'East Route',
          capacity: 12,
          assignedStudents: 8,
          utilizationRate: 66.7,
        },
      ],
      attendanceByStatus: [
        { status: 'Present', count: 180, percentage: 85.7 },
        { status: 'NoShow', count: 15, percentage: 7.1 },
        { status: 'Absent/Excused', count: 15, percentage: 7.1 },
      ],
      noShowCount: 15,
      uniqueNoShowStudents: 8,
      fleetStatus: [
        { status: 'active', count: 5 },
        { status: 'maintenance', count: 1 },
        { status: 'inactive', count: 0 },
      ],
    });
  }),

  // Dashboard Childcare Metrics (hardcoded - real data comes from backend)
  http.get('/api/v1/dashboard/childcare', () => {
    const locationsWithChildcare = mockLocations.filter(
      (l) => l.hasChildcare,
    ).length;

    return HttpResponse.json({
      overview: {
        totalChildren: 32,
        uniqueParents: 18,
        sessionsHeld: 48,
        locationsUsed: locationsWithChildcare,
      },
      attendance: {
        present: 280,
        total: 320,
        attendanceRate: 87.5,
      },
      sessionUtilization: [
        {
          sessionId: 'session-1',
          sessionName: 'Morning Care',
          locationName: 'Downtown Center',
          maxCapacity: 15,
          attended: 12,
          utilizationRate: 80.0,
        },
        {
          sessionId: 'session-2',
          sessionName: 'Afternoon Care',
          locationName: 'Downtown Center',
          maxCapacity: 15,
          attended: 10,
          utilizationRate: 66.7,
        },
        {
          sessionId: 'session-3',
          sessionName: 'Morning Care',
          locationName: 'North Branch',
          maxCapacity: 12,
          attended: 9,
          utilizationRate: 75.0,
        },
      ],
      incidents: [
        { incidentType: 'Minor Injury', count: 2 },
        { incidentType: 'Behavioral', count: 3 },
        { incidentType: 'Medical', count: 1 },
      ],
    });
  }),

  // Dashboard Staff Metrics
  http.get('/api/v1/dashboard/staff', () => {
    const tutors = mockUsers.filter((u) => u.isTutor);
    const coordinators = mockUsers.filter((u) => u.isCoordinator);
    const volunteers = mockUsers.filter((u) => u.volunteerStatus === 'Active');

    const tutorWorkload = tutors.slice(0, 8).map((t) => {
      const classCount = faker.number.int({ min: 1, max: 4 });
      return {
        tutorId: t.id,
        tutorName: `${t.firstName} ${t.lastName}`,
        classCount,
        totalStudentCapacity:
          classCount * faker.number.int({ min: 10, max: 20 }),
      };
    });

    const appointmentsByStaff = coordinators.slice(0, 6).map((c) => ({
      userId: c.id,
      userName: `${c.firstName} ${c.lastName}`,
      appointmentCount: faker.number.int({ min: 5, max: 20 }),
    }));

    return HttpResponse.json({
      overview: {
        totalStaff: mockUsers.length,
        coordinators: coordinators.length,
        tutors: tutors.length,
        volunteers: volunteers.length,
      },
      tutorWorkload,
      appointmentsByStaff,
    });
  }),
];
