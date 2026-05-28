import * as XLSX from "xlsx";
import type { UserRole } from "../types";

export type PdsEmployeeNotes = {
  strengths: string;
  weaknesses: string;
  notes: string;
  tags: string[];
};

export type PdsUserDefaults = {
  fullName: string;
  email: string;
  departmentId: string;
  role: UserRole;
  workload: number;
  burnoutLevel: "low";
  status: "active";
};

export type ParsedPdsImport = {
  profile: PdsUserDefaults;
  employeeNotes: PdsEmployeeNotes;
};

type DepartmentOption = {
  value: string;
  label: string;
};

type SheetRows = string[][];

type WorkExperience = {
  from: string;
  to: string;
  position: string;
  office: string;
};

type Eligibility = {
  title: string;
  rating: string;
};

type Education = {
  level: string;
  degree: string;
  to: string;
  yearGraduated: string;
  highestLevel: string;
};

type Training = {
  title: string;
  type: string;
};

const NOTE_TAG_LIMIT = 8;

const normalizeWhitespace = (value: unknown) =>
  String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isMeaningful = (value: unknown) => {
  const text = normalizeWhitespace(value);
  return text.length > 0 && !/^N\/?A$/i.test(text);
};

const readRows = (workbook: XLSX.WorkBook, sheetName: string): SheetRows => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`PDS sheet "${sheetName}" is missing.`);
  }

  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  }) as SheetRows;
};

const cell = (rows: SheetRows, rowIndex: number, columnIndex: number) =>
  normalizeWhitespace(rows[rowIndex]?.[columnIndex]);

const findRowIndex = (
  rows: SheetRows,
  matcher: RegExp,
  maxRow = rows.length,
) =>
  rows.findIndex(
    (row, index) =>
      index < maxRow && row.some((value) => matcher.test(normalizeWhitespace(value))),
  );

const findValueRightOfLabel = (
  rows: SheetRows,
  matcher: RegExp,
  maxRow: number,
) => {
  for (let rowIndex = 0; rowIndex < Math.min(maxRow, rows.length); rowIndex += 1) {
    const row = rows[rowIndex] || [];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (!matcher.test(normalizeWhitespace(row[columnIndex]))) continue;

      for (
        let valueColumn = columnIndex + 1;
        valueColumn < Math.min(row.length, columnIndex + 8);
        valueColumn += 1
      ) {
        const value = normalizeWhitespace(row[valueColumn]);
        if (isMeaningful(value) && !matcher.test(value)) return value;
      }
    }
  }

  return "";
};

const titleCase = (value: string) => {
  const preserve = new Set([
    "BPLO",
    "CSE",
    "CSE-PPT",
    "IT",
    "LGU",
    "PDS",
    "PPP",
    "PPT",
  ]);

  return normalizeWhitespace(value)
    .toLowerCase()
    .split(" ")
    .map((word) => {
      const stripped = word.replace(/[^a-z0-9-]/gi, "").toUpperCase();
      if (preserve.has(stripped)) return stripped;
      if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(word)) {
        return word.toUpperCase();
      }
      return word.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    })
    .join(" ");
};

const normalizeNamePart = (value: string) =>
  titleCase(value).replace(/\s+(Jr|Sr)\.?$/i, " $1.");

const middleInitial = (middleName: string) => {
  const first = normalizeNamePart(middleName).charAt(0);
  return first ? `${first}.` : "";
};

const unique = <T,>(values: T[]) => Array.from(new Set(values));

const formatList = (values: string[]) => {
  if (values.length <= 1) return values[0] || "";
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
};

const normalizeEligibilityTitle = (value: string) =>
  titleCase(value.replace(/\bCSE\s*-\s*PPT\b/i, "CSE-PPT"));

const normalizeDegree = (value: string) => {
  const text = normalizeWhitespace(value).replace(/\.$/, "");
  if (/BS\s+COMPUTER\s+SCIENCE/i.test(text)) return "BS Computer Science";
  if (/BS\s+COMPUTER\s+ENG/i.test(text)) return "BS Computer Engineering";
  return titleCase(text);
};

const graduateFocus = (degree: string) => {
  if (/PUBLIC\s+ADMINISTRATION/i.test(degree)) return "Public Administration";
  if (/PUBLIC\s+MANAGEMENT/i.test(degree)) return "Public Management";

  return titleCase(
    degree
      .replace(/^MASTERS?\s+(IN|OF\s+ARTS\s+IN)\s+/i, "")
      .replace(/^MASTER\s+OF\s+ARTS\s+IN\s+/i, ""),
  );
};

const departmentLabelFromOffice = (office: string) => {
  if (/business\s+permits?.*licen[cs]ing|licen[cs]ing.*business\s+permits?/i.test(office)) {
    return "BPLO";
  }
  return titleCase(office);
};

const resolveDepartmentId = (
  office: string,
  departments: DepartmentOption[],
) => {
  const officeText = normalizeWhitespace(office);
  if (!officeText) return "";

  if (departmentLabelFromOffice(officeText) === "BPLO") {
    const bplo = departments.find(
      (department) =>
        /^BPLO$/i.test(department.value) ||
        /^BPLO$/i.test(department.label) ||
        /business\s+permits?.*licen[cs]ing/i.test(department.label),
    );
    return bplo?.value || "BPLO";
  }

  const officeLower = officeText.toLowerCase();
  const exact = departments.find(
    (department) =>
      department.value.toLowerCase() === officeLower ||
      department.label.toLowerCase() === officeLower,
  );
  if (exact) return exact.value;

  const fuzzy = departments.find((department) => {
    const label = department.label.toLowerCase();
    return officeLower.includes(label) || label.includes(officeLower);
  });
  return fuzzy?.value || "";
};

const parseFullName = (c1Rows: SheetRows) => {
  const surname = findValueRightOfLabel(c1Rows, /^SURNAME$/i, 15);
  const firstName = findValueRightOfLabel(c1Rows, /^FIRST NAME$/i, 15);
  const middleName = findValueRightOfLabel(c1Rows, /^MIDDLE NAME$/i, 15);
  return [normalizeNamePart(firstName), middleInitial(middleName), normalizeNamePart(surname)]
    .filter(Boolean)
    .join(" ");
};

const parseEmail = (c1Rows: SheetRows) => {
  const flattened = c1Rows.flatMap((row) =>
    row.map((value) => normalizeWhitespace(value)),
  );
  const email = flattened.find((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  return email || "";
};

const parseEducation = (c1Rows: SheetRows): Education[] => {
  const start = findRowIndex(c1Rows, /EDUCATIONAL BACKGROUND/i);
  if (start < 0) return [];

  const education: Education[] = [];
  let currentLevel = "";

  c1Rows.slice(start + 1).forEach((row) => {
    const level = normalizeWhitespace(row[1] || row[0]);
    if (isMeaningful(level)) currentLevel = level;
    if (/continue|signature|date|cs form/i.test(currentLevel)) return;

    const degree = normalizeWhitespace(row[6]);
    if (!isMeaningful(currentLevel) || !isMeaningful(degree)) return;

    education.push({
      level: currentLevel,
      degree,
      to: normalizeWhitespace(row[10]),
      highestLevel: normalizeWhitespace(row[11]),
      yearGraduated: normalizeWhitespace(row[12]),
    });
  });

  return education;
};

const parseEligibility = (c2Rows: SheetRows): Eligibility | null => {
  const workStart = findRowIndex(c2Rows, /WORK EXPERIENCE/i);
  const rows = workStart >= 0 ? c2Rows.slice(0, workStart) : c2Rows.slice(0, 8);
  const eligibilityRow = rows.find((row) => {
    const title = normalizeWhitespace(row[0]);
    return (
      isMeaningful(title) &&
      !/^\d+\.?$/.test(title) &&
      !/civil service|career service|continue|license/i.test(title)
    );
  });

  if (!eligibilityRow) return null;

  return {
    title: normalizeEligibilityTitle(normalizeWhitespace(eligibilityRow[0])),
    rating: normalizeWhitespace(eligibilityRow[5]),
  };
};

const parseWorkExperience = (c2Rows: SheetRows): WorkExperience[] => {
  const workStart = findRowIndex(c2Rows, /WORK EXPERIENCE/i);
  if (workStart < 0) return [];

  return c2Rows
    .slice(workStart + 1)
    .map((row): WorkExperience => ({
      from: normalizeWhitespace(row[0]),
      to: normalizeWhitespace(row[2]),
      position: titleCase(normalizeWhitespace(row[3])),
      office: normalizeWhitespace(row[6]),
    }))
    .filter((experience) => isMeaningful(experience.position) && isMeaningful(experience.office))
    .filter((experience) => !/position title|continue|signature|date/i.test(experience.position));
};

const parseTrainings = (c3Rows: SheetRows): Training[] => {
  const start = findRowIndex(c3Rows, /LEARNING AND DEVELOPMENT/i);
  const end = findRowIndex(c3Rows, /OTHER INFORMATION/i);
  if (start < 0) return [];

  return c3Rows
    .slice(start + 1, end > start ? end : undefined)
    .map((row): Training => ({
      title: normalizeWhitespace(row[0]),
      type: titleCase(normalizeWhitespace(row[7])),
    }))
    .filter((training) => isMeaningful(training.title))
    .filter((training) => !/title of learning|continue|from|to|^\d+\.$/i.test(training.title));
};

const parseSpecialSkills = (c3Rows: SheetRows) => {
  const start = findRowIndex(c3Rows, /SPECIAL SKILLS/i);
  if (start < 0) return [];

  const skills: string[] = [];
  for (let rowIndex = start + 1; rowIndex < c3Rows.length; rowIndex += 1) {
    const value = normalizeWhitespace(c3Rows[rowIndex]?.[0]);
    if (!isMeaningful(value)) continue;
    if (/continue|signature|date|cs form/i.test(value)) break;
    skills.push(titleCase(value.replace(/\bDESIGNING\b/i, "Design")));
  }

  return skills;
};

const buildStrengths = (
  currentWork: WorkExperience | undefined,
  trainings: Training[],
) => {
  const haystack = [
    currentWork?.position,
    currentWork?.office,
    ...trainings.map((training) => `${training.title} ${training.type}`),
  ]
    .join(" ")
    .toLowerCase();

  const strengths: string[] = [];
  if (/administrative|admin officer/.test(haystack)) {
    strengths.push("Administrative Management");
  }
  if (/business permits?.*licen[cs]ing|licen[cs]ing.*business permits?/.test(haystack)) {
    strengths.push("Business Permits & Licensing");
  }
  if (/public-private|ppp|investment/.test(haystack)) {
    strengths.push("PPP & Investment Facilitation");
  }
  if (/supervisory|leadership|management/.test(haystack)) {
    strengths.push("Supervisory Leadership");
  }

  return unique(strengths).join(", ");
};

const buildTags = (
  currentWork: WorkExperience | undefined,
  education: Education[],
  trainings: Training[],
  specialSkills: string[],
) => {
  const haystack = [
    currentWork?.position,
    currentWork?.office,
    ...education.map((item) => item.degree),
    ...trainings.map((training) => `${training.title} ${training.type}`),
    ...specialSkills,
  ]
    .join(" ")
    .toLowerCase();

  const tags: string[] = [];
  if (departmentLabelFromOffice(currentWork?.office || "") === "BPLO") tags.push("BPLO");
  if (/administrative|admin officer/.test(haystack)) tags.push("Administrative");
  if (/public-private|ppp/.test(haystack)) tags.push("PPP");
  if (/computer|information technology|\bit\b/.test(haystack)) tags.push("IT");
  if (/graphic design/.test(haystack)) tags.push("Graphic Design");

  return unique(tags).slice(0, NOTE_TAG_LIMIT);
};

const buildNotes = (
  currentWork: WorkExperience | undefined,
  education: Education[],
  eligibility: Eligibility | null,
) => {
  const collegeDegree = education.find((item) => /COLLEGE/i.test(item.level))?.degree;
  const graduateStudies = education.filter((item) => /GRADUATE/i.test(item.level));
  const departmentLabel = departmentLabelFromOffice(currentWork?.office || "");
  const sentences: string[] = [];

  if (currentWork?.position) {
    const role = currentWork.position;
    const rolePrefix = departmentLabel ? `${role} at ${departmentLabel}` : role;
    const degreeText = collegeDegree
      ? ` with ${normalizeDegree(collegeDegree)} background`
      : "";
    sentences.push(`${rolePrefix}${degreeText}.`);
  }

  if (eligibility?.title) {
    const ratingText = eligibility.rating ? ` (${eligibility.rating})` : "";
    sentences.push(`Holds ${eligibility.title} eligibility${ratingText}.`);
  }

  const graduateFocuses = unique(
    graduateStudies.map((item) => graduateFocus(item.degree)).filter(Boolean),
  );
  if (graduateFocuses.length) {
    const isPursuing = graduateStudies.some(
      (item) =>
        /present/i.test(item.to) ||
        (!isMeaningful(item.yearGraduated) && isMeaningful(item.highestLevel)),
    );
    sentences.push(
      `${isPursuing ? "Pursuing" : "Completed"} graduate studies in ${formatList(
        graduateFocuses,
      )}.`,
    );
  }

  return sentences.join(" ");
};

const validatePdsWorkbook = (workbook: XLSX.WorkBook, rowsBySheet: Record<string, SheetRows>) => {
  const missing = ["C1", "C2", "C3"].filter((sheetName) => !workbook.Sheets[sheetName]);
  if (missing.length) {
    throw new Error(`Invalid PDS file. Missing sheet(s): ${missing.join(", ")}.`);
  }

  const c1Text = rowsBySheet.C1.flat().map(normalizeWhitespace).join(" ");
  const c2Text = rowsBySheet.C2.flat().map(normalizeWhitespace).join(" ");
  const c3Text = rowsBySheet.C3.flat().map(normalizeWhitespace).join(" ");

  if (
    !/PERSONAL DATA SHEET/i.test(c1Text) ||
    !/CIVIL SERVICE ELIGIBILITY/i.test(c2Text) ||
    !/LEARNING AND DEVELOPMENT/i.test(c3Text)
  ) {
    throw new Error("Invalid PDS file. Please upload a CSC Personal Data Sheet workbook.");
  }
};

export const parsePdsWorkbook = (
  data: ArrayBuffer,
  departments: DepartmentOption[] = [],
): ParsedPdsImport => {
  const workbook = XLSX.read(data, { type: "array", cellDates: false });
  const rowsBySheet = {
    C1: readRows(workbook, "C1"),
    C2: readRows(workbook, "C2"),
    C3: readRows(workbook, "C3"),
  };

  validatePdsWorkbook(workbook, rowsBySheet);

  const education = parseEducation(rowsBySheet.C1);
  const eligibility = parseEligibility(rowsBySheet.C2);
  const workExperience = parseWorkExperience(rowsBySheet.C2);
  const currentWork =
    workExperience.find((experience) => /present/i.test(experience.to)) ||
    workExperience[0];
  const trainings = parseTrainings(rowsBySheet.C3);
  const specialSkills = parseSpecialSkills(rowsBySheet.C3);
  const departmentId = resolveDepartmentId(currentWork?.office || "", departments);

  return {
    profile: {
      fullName: parseFullName(rowsBySheet.C1),
      email: parseEmail(rowsBySheet.C1),
      departmentId,
      role: "employee",
      workload: 0,
      burnoutLevel: "low",
      status: "active",
    },
    employeeNotes: {
      notes: buildNotes(currentWork, education, eligibility),
      strengths: buildStrengths(currentWork, trainings),
      tags: buildTags(currentWork, education, trainings, specialSkills),
      weaknesses: "",
    },
  };
};

export const parsePdsFile = async (
  file: File,
  departments: DepartmentOption[] = [],
) => parsePdsWorkbook(await file.arrayBuffer(), departments);
