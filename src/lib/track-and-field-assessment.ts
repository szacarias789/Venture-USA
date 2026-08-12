import { z } from "zod";
import { getAge } from "./assessment";

type Translate = (key: string) => string;

const optionalUrl = (t: Translate) =>
  z.string().trim().refine((value) => !value || /^https?:\/\/.+/i.test(value), t("validation.url"));

export function createTrackAndFieldSchema(t: Translate) {
  const required = z.string().trim().min(1, t("validation.required"));
  const email = required.email(t("validation.email"));
  const phone = required.regex(/^\+?[0-9()\s.-]{7,24}$/, t("validation.phone"));

  return z
    .object({
      sport: z.literal("Track & Field"),
      fullName: required,
      email,
      whatsapp: phone,
      birthDate: required
        .refine((value) => getAge(value) !== null, t("validation.birthDate"))
        .refine((value) => new Date(`${value}T00:00:00`) <= new Date(), t("validation.futureDate")),
      gender: required,
      nationality: required,
      residenceCountry: required,
      height: required,
      graduationYear: required,
      eventCategory: z.enum(["track", "field", "combined", "crossCountry"]),
      primaryEvent: required,
      secondaryEvents: z.string(),
      personalBests: z
        .array(
          z.object({
            event: required,
            performance: required,
            units: required,
            wind: z.string(),
            date: required,
            competition: required,
          }),
        )
        .min(1, t("validation.required"))
        .max(12),
      verifiedResultsLink: optionalUrl(t).refine(Boolean, t("validation.required")),
      currentTeam: required,
      competitionLevel: required,
      experienceYears: required,
      representativeExperience: required,
      achievements: required,
      coachName: required,
      coachContact: required,
      competitionVideo: optionalUrl(t),
      injuries: z.string(),
      academicAverage: required,
      gpaScale: required,
      testScore: z.string(),
      intendedMajor: z.string(),
      startYear: required,
      annualBudget: required,
      mainGoal: required,
      concern: required,
      marketingSource: required,
      guardianName: z.string(),
      guardianEmail: z.string(),
      guardianWhatsapp: z.string(),
      guardianConsent: z.boolean(),
      privacyConsent: z.boolean().refine(Boolean, t("validation.consent")),
      contactConsent: z.boolean().refine(Boolean, t("validation.consent")),
    })
    .superRefine((data, context) => {
      if (data.eventCategory === "field" && !data.competitionVideo) {
        context.addIssue({
          code: "custom",
          path: ["competitionVideo"],
          message: t("trackAndField.validation.fieldVideo"),
        });
      }

      const age = getAge(data.birthDate);
      if (age !== null && age < 18) {
        if (!data.guardianName.trim()) {
          context.addIssue({ code: "custom", path: ["guardianName"], message: t("validation.guardian") });
        }
        if (!z.string().email().safeParse(data.guardianEmail).success) {
          context.addIssue({ code: "custom", path: ["guardianEmail"], message: t("validation.email") });
        }
        if (!/^\+?[0-9()\s.-]{7,24}$/.test(data.guardianWhatsapp.trim())) {
          context.addIssue({ code: "custom", path: ["guardianWhatsapp"], message: t("validation.phone") });
        }
        if (!data.guardianConsent) {
          context.addIssue({ code: "custom", path: ["guardianConsent"], message: t("validation.consent") });
        }
      }
    });
}

export type TrackAndFieldValues = z.infer<ReturnType<typeof createTrackAndFieldSchema>>;

export interface TrackAndFieldSubmissionRequest {
  answers: TrackAndFieldValues;
  context: {
    language: string;
    sourceRoute: "/sergiozacarias/track-and-field";
    formStartedAt: number;
    clientSubmissionId: string;
    website: string;
  };
}

export const trackAndFieldDefaultValues: TrackAndFieldValues = {
  sport: "Track & Field",
  fullName: "",
  email: "",
  whatsapp: "",
  birthDate: "",
  gender: "",
  nationality: "",
  residenceCountry: "",
  height: "",
  graduationYear: "",
  eventCategory: "track",
  primaryEvent: "",
  secondaryEvents: "",
  personalBests: [{ event: "", performance: "", units: "", wind: "", date: "", competition: "" }],
  verifiedResultsLink: "",
  currentTeam: "",
  competitionLevel: "",
  experienceYears: "",
  representativeExperience: "",
  achievements: "",
  coachName: "",
  coachContact: "",
  competitionVideo: "",
  injuries: "",
  academicAverage: "",
  gpaScale: "",
  testScore: "",
  intendedMajor: "",
  startYear: "",
  annualBudget: "",
  mainGoal: "",
  concern: "",
  marketingSource: "",
  guardianName: "",
  guardianEmail: "",
  guardianWhatsapp: "",
  guardianConsent: false,
  privacyConsent: false,
  contactConsent: false,
};
