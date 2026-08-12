import { useEffect, useMemo, useState, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleUserRound,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Medal,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { useFieldArray, useForm, useWatch, type FieldPath } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getAge } from "../lib/assessment";
import { SubmissionError, submitAssessment } from "../lib/submission";
import {
  createTrackAndFieldSchema,
  trackAndFieldDefaultValues,
  type TrackAndFieldSubmissionRequest,
  type TrackAndFieldValues,
} from "../lib/track-and-field-assessment";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

const DRAFT_STORAGE_KEY = "venture-track-and-field-assessment-draft";
const budgetValues = ["under10", "10to20", "20to30", "30to40", "over40", "unsure"];
const goalValues = ["scholarship", "academic", "professional", "experience", "other"];
const sourceValues = ["instagram", "whatsapp", "friend", "coach", "search", "event", "other"];
const categoryValues = ["track", "field", "combined", "crossCountry"] as const;
const genderValues = ["female", "male", "nonBinary", "preferNot"] as const;
const stepMeta = [
  { key: "athlete", icon: CircleUserRound },
  { key: "sport", icon: Medal },
  { key: "academics", icon: GraduationCap },
  { key: "goals", icon: Target },
];

const stepFields: FieldPath<TrackAndFieldValues>[][] = [
  ["fullName", "email", "whatsapp", "birthDate", "gender", "nationality", "residenceCountry", "height", "graduationYear"],
  [
    "eventCategory",
    "primaryEvent",
    "secondaryEvents",
    "personalBests",
    "verifiedResultsLink",
    "currentTeam",
    "competitionLevel",
    "experienceYears",
    "representativeExperience",
    "achievements",
    "coachName",
    "coachContact",
    "competitionVideo",
    "injuries",
  ],
  ["academicAverage", "gpaScale", "testScore", "intendedMajor"],
  [
    "startYear",
    "annualBudget",
    "mainGoal",
    "concern",
    "marketingSource",
    "guardianName",
    "guardianEmail",
    "guardianWhatsapp",
    "guardianConsent",
    "privacyConsent",
    "contactConsent",
  ],
];

function Field({
  label,
  error,
  optional,
  help,
  children,
}: {
  label: string;
  error?: string;
  optional?: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-slate-800">
      <span>
        {label} {!optional && <span className="text-[#150A56]">*</span>}
        {optional && <span className="ml-1 font-normal text-slate-400">({optional})</span>}
      </span>
      {children}
      {help && <span className="text-xs leading-relaxed font-normal text-slate-500">{help}</span>}
      {error && <span role="alert" className="text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="form-step-enter relative overflow-hidden rounded-2xl border border-[#150A56]/10 bg-gradient-to-br from-white via-white to-[#F3F3F3]/65 p-5 shadow-sm sm:p-7">
      <div className="absolute top-0 left-0 h-1 w-20 rounded-br-full bg-[#FCEC62]" />
      <div className="mb-7 border-b border-[#150A56]/10 pb-5">
        <h2 className="font-display text-3xl font-semibold tracking-wide text-[#150A56] uppercase sm:text-4xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
      </div>
      {children}
    </section>
  );
}

function CheckboxField({
  label,
  error,
  registration,
}: {
  label: ReactNode;
  error?: string;
  registration: ReturnType<ReturnType<typeof useForm<TrackAndFieldValues>>["register"]>;
}) {
  return (
    <label className="block">
      <span className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-relaxed transition ${
        error ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
      }`}>
        <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-[#150A56]" {...registration} />
        <span className="text-slate-700">{label}</span>
      </span>
      {error && <span role="alert" className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

export function TrackAndFieldAssessmentForm() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [formStartedAt] = useState(() => Date.now());
  const [clientSubmissionId] = useState(() => crypto.randomUUID());
  const [website, setWebsite] = useState("");
  const schema = useMemo(() => createTrackAndFieldSchema(t), [t]);
  const initialValues = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) ?? "{}") as Partial<TrackAndFieldValues>;
      return { ...trackAndFieldDefaultValues, ...saved, sport: "Track & Field" as const };
    } catch {
      return trackAndFieldDefaultValues;
    }
  }, []);
  const {
    register,
    handleSubmit,
    control,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<TrackAndFieldValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
    mode: "onTouched",
  });
  const { fields: personalBestFields, append, remove } = useFieldArray({ control, name: "personalBests" });
  const draftValues = useWatch({ control });
  const birthDate = useWatch({ control, name: "birthDate" });
  const eventCategory = useWatch({ control, name: "eventCategory" });
  const isMinor = (getAge(birthDate) ?? 18) < 18;
  const optional = t("common.optional");
  const ActiveStepIcon = stepMeta[step].icon;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftValues));
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [draftValues]);

  const nextStep = async () => {
    const valid = await trigger(stepFields[step], { shouldFocus: true });
    if (!valid) {
      toast.error(t("notifications.stepError"));
      return;
    }
    setStep((value) => Math.min(value + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (values: TrackAndFieldValues) => {
    const payload: TrackAndFieldSubmissionRequest = {
      answers: values,
      context: {
        language: i18n.resolvedLanguage?.split("-")[0] ?? "en",
        sourceRoute: "/sergiozacarias/track-and-field",
        formStartedAt,
        clientSubmissionId,
        website,
      },
    };
    try {
      const result = await submitAssessment(payload);
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      toast.success(t("notifications.saved"));
      navigate("/sergiozacarias/track-and-field/confirmation", {
        state: { name: values.fullName.split(" ")[0], reference: result.id },
      });
    } catch (error) {
      const code = error instanceof SubmissionError ? error.code : "submission_failed";
      const messageKey =
        code === "duplicate" ? "notifications.duplicate"
          : code === "rate_limited" ? "notifications.rateLimited"
            : code === "invalid_submission" ? "notifications.invalidSubmission"
              : "notifications.error";
      toast.error(t(messageKey));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] size-px opacity-0"
      />
      <div className="mb-8" aria-label={t("progress.label", { current: step + 1, total: 4 })}>
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-bold tracking-wide text-[#150A56] uppercase">
            <span className="grid size-8 place-items-center rounded-lg bg-[#FCEC62]/55">
              <ActiveStepIcon aria-hidden="true" className="size-4" />
            </span>
            {t("progress.label", { current: step + 1, total: 4 })}
          </span>
          <span className="text-xs font-semibold text-slate-500">{t(`trackAndField.progress.${stepMeta[step].key}`)}</span>
        </div>
        <div role="progressbar" aria-valuemin={1} aria-valuemax={4} aria-valuenow={step + 1} className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#150A56] transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
      </div>

      {step === 0 && (
        <FormSection title={t("trackAndField.sections.athleteTitle")} description={t("trackAndField.sections.athleteDescription")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("fields.fullName")} error={errors.fullName?.message}><Input autoComplete="name" {...register("fullName")} /></Field>
            <Field label={t("fields.email")} error={errors.email?.message}><Input type="email" inputMode="email" autoComplete="email" {...register("email")} /></Field>
            <Field label={t("fields.whatsapp")} error={errors.whatsapp?.message}><Input type="tel" inputMode="tel" autoComplete="tel" placeholder={t("fields.whatsappPlaceholder")} {...register("whatsapp")} /></Field>
            <Field label={t("fields.birthDate")} error={errors.birthDate?.message}><Input type="date" max={new Date().toISOString().slice(0, 10)} {...register("birthDate")} /></Field>
            <Field label={t("trackAndField.fields.gender")} error={errors.gender?.message}>
              <Select {...register("gender")}><option value="">{t("common.select")}</option>{genderValues.map((value) => <option key={value} value={value}>{t(`trackAndField.options.gender.${value}`)}</option>)}</Select>
            </Field>
            <Field label={t("fields.nationality")} error={errors.nationality?.message}><Input {...register("nationality")} /></Field>
            <Field label={t("fields.residenceCountry")} error={errors.residenceCountry?.message}><Input {...register("residenceCountry")} /></Field>
            <Field label={t("fields.height")} error={errors.height?.message}><Input placeholder={t("fields.heightPlaceholder")} {...register("height")} /></Field>
            <Field label={t("fields.graduationYear")} error={errors.graduationYear?.message}><Input type="number" inputMode="numeric" {...register("graduationYear")} /></Field>
          </div>
        </FormSection>
      )}

      {step === 1 && (
        <FormSection title={t("trackAndField.sections.sportTitle")} description={t("trackAndField.sections.sportDescription")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("trackAndField.fields.eventCategory")} error={errors.eventCategory?.message}>
              <Select {...register("eventCategory")}>{categoryValues.map((value) => <option key={value} value={value}>{t(`trackAndField.options.category.${value}`)}</option>)}</Select>
            </Field>
            <Field label={t("trackAndField.fields.primaryEvent")} error={errors.primaryEvent?.message}><Input placeholder={t("trackAndField.placeholders.events")} {...register("primaryEvent")} /></Field>
            <div className="sm:col-span-2"><Field label={t("trackAndField.fields.secondaryEvents")} optional={optional} error={errors.secondaryEvents?.message}><Input placeholder={t("trackAndField.placeholders.secondaryEvents")} {...register("secondaryEvents")} /></Field></div>
          </div>

          <div className="mt-7 border-t border-slate-200 pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-wide text-[#150A56] uppercase">{t("trackAndField.fields.personalBests")}</h3>
                <p className="mt-1 text-sm text-slate-600">{t("trackAndField.fields.personalBestsHelp")}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ event: "", performance: "", units: "", wind: "", date: "", competition: "" })} disabled={personalBestFields.length >= 12}>
                <Plus aria-hidden="true" className="size-4" />{t("trackAndField.actions.addPerformance")}
              </Button>
            </div>
            <div className="mt-5 grid gap-4">
              {personalBestFields.map((item, index) => (
                <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#150A56]">{t("trackAndField.fields.performanceNumber", { number: index + 1 })}</span>
                    {personalBestFields.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} aria-label={t("trackAndField.actions.removePerformance")}><Trash2 aria-hidden="true" className="size-4" /></Button>}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("trackAndField.fields.event")} error={errors.personalBests?.[index]?.event?.message}><Input placeholder={t("trackAndField.placeholders.events")} {...register(`personalBests.${index}.event`)} /></Field>
                    <Field label={t("trackAndField.fields.performance")} error={errors.personalBests?.[index]?.performance?.message}><Input placeholder={t("trackAndField.placeholders.performance")} {...register(`personalBests.${index}.performance`)} /></Field>
                    <Field label={t("trackAndField.fields.units")} error={errors.personalBests?.[index]?.units?.message}><Input placeholder={t("trackAndField.placeholders.units")} {...register(`personalBests.${index}.units`)} /></Field>
                    <Field label={t("trackAndField.fields.wind")} optional={optional} error={errors.personalBests?.[index]?.wind?.message}><Input placeholder="+1.2 m/s" {...register(`personalBests.${index}.wind`)} /></Field>
                    <Field label={t("trackAndField.fields.date")} error={errors.personalBests?.[index]?.date?.message}><Input type="date" max={new Date().toISOString().slice(0, 10)} {...register(`personalBests.${index}.date`)} /></Field>
                    <Field label={t("trackAndField.fields.competition")} error={errors.personalBests?.[index]?.competition?.message}><Input {...register(`personalBests.${index}.competition`)} /></Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2"><Field label={t("trackAndField.fields.verifiedResultsLink")} help={t("trackAndField.fields.verifiedResultsHelp")} error={errors.verifiedResultsLink?.message}><Input type="url" inputMode="url" placeholder="https://" {...register("verifiedResultsLink")} /></Field></div>
            <Field label={t("trackAndField.fields.currentTeam")} error={errors.currentTeam?.message}><Input {...register("currentTeam")} /></Field>
            <Field label={t("trackAndField.fields.competitionLevel")} error={errors.competitionLevel?.message}><Input {...register("competitionLevel")} /></Field>
            <Field label={t("trackAndField.fields.experienceYears")} error={errors.experienceYears?.message}><Input type="number" min="0" max="40" inputMode="numeric" {...register("experienceYears")} /></Field>
            <Field label={t("fields.coachName")} error={errors.coachName?.message}><Input {...register("coachName")} /></Field>
            <div className="sm:col-span-2"><Field label={t("trackAndField.fields.representativeExperience")} error={errors.representativeExperience?.message}><Textarea {...register("representativeExperience")} /></Field></div>
            <div className="sm:col-span-2"><Field label={t("trackAndField.fields.achievements")} error={errors.achievements?.message}><Textarea {...register("achievements")} /></Field></div>
            <Field label={t("fields.coachContact")} error={errors.coachContact?.message}><Input placeholder={t("fields.coachContactPlaceholder")} {...register("coachContact")} /></Field>
            <Field label={t("trackAndField.fields.competitionVideo")} optional={eventCategory === "field" ? undefined : optional} help={eventCategory === "field" ? t("trackAndField.fields.fieldVideoHelp") : undefined} error={errors.competitionVideo?.message}><Input type="url" inputMode="url" placeholder="https://" {...register("competitionVideo")} /></Field>
            <div className="sm:col-span-2"><Field label={t("trackAndField.fields.injuries")} optional={optional} error={errors.injuries?.message}><Textarea {...register("injuries")} /></Field></div>
          </div>
        </FormSection>
      )}

      {step === 2 && (
        <FormSection title={t("trackAndField.sections.academicsTitle")} description={t("trackAndField.sections.academicsDescription")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("trackAndField.fields.academicAverage")} error={errors.academicAverage?.message}><Input {...register("academicAverage")} /></Field>
            <Field label={t("trackAndField.fields.gpaScale")} error={errors.gpaScale?.message}><Input placeholder="4.0, 10, 100…" {...register("gpaScale")} /></Field>
            <Field label={t("trackAndField.fields.testScore")} optional={optional} error={errors.testScore?.message}><Input {...register("testScore")} /></Field>
            <Field label={t("fields.intendedMajor")} optional={optional} error={errors.intendedMajor?.message}><Input {...register("intendedMajor")} /></Field>
          </div>
        </FormSection>
      )}

      {step === 3 && (
        <FormSection title={t("trackAndField.sections.goalsTitle")} description={t("trackAndField.sections.goalsDescription")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={t("trackAndField.fields.startYear")} error={errors.startYear?.message}><Input type="number" inputMode="numeric" {...register("startYear")} /></Field>
            <Field label={t("fields.annualBudget")} help={t("fields.annualBudgetHelp")} error={errors.annualBudget?.message}>
              <Select {...register("annualBudget")}><option value="">{t("common.select")}</option>{budgetValues.map((value) => <option key={value} value={value}>{t(`options.budget.${value}`)}</option>)}</Select>
            </Field>
            <Field label={t("fields.mainGoal")} error={errors.mainGoal?.message}>
              <Select {...register("mainGoal")}><option value="">{t("common.select")}</option>{goalValues.map((value) => <option key={value} value={value}>{t(`options.goal.${value}`)}</option>)}</Select>
            </Field>
            <Field label={t("fields.marketingSource")} error={errors.marketingSource?.message}>
              <Select {...register("marketingSource")}><option value="">{t("common.select")}</option>{sourceValues.map((value) => <option key={value} value={value}>{t(`options.source.${value}`)}</option>)}</Select>
            </Field>
            <div className="sm:col-span-2"><Field label={t("fields.concern")} error={errors.concern?.message}><Textarea {...register("concern")} /></Field></div>
          </div>

          {isMinor && (
            <div className="mt-8 rounded-2xl border border-[#150A56]/20 bg-[#FCEC62]/15 p-5 sm:p-6">
              <h3 className="font-display text-2xl font-semibold tracking-wide text-[#150A56] uppercase">{t("sections.guardianTitle")}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{t("sections.guardianDescription")}</p>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label={t("fields.guardianName")} error={errors.guardianName?.message}><Input {...register("guardianName")} /></Field>
                <Field label={t("fields.guardianEmail")} error={errors.guardianEmail?.message}><Input type="email" {...register("guardianEmail")} /></Field>
                <div className="sm:col-span-2"><Field label={t("fields.guardianWhatsapp")} error={errors.guardianWhatsapp?.message}><Input type="tel" {...register("guardianWhatsapp")} /></Field></div>
                <div className="sm:col-span-2"><CheckboxField label={t("fields.guardianConsent")} error={errors.guardianConsent?.message} registration={register("guardianConsent")} /></div>
              </div>
            </div>
          )}

          <div className="mt-8">
            <h3 className="font-display mb-4 text-2xl font-semibold tracking-wide text-[#150A56] uppercase">{t("sections.consentTitle")}</h3>
            <div className="grid gap-3">
              <CheckboxField
                label={<>{t("fields.privacyConsent")} <a href="/privacy" target="_blank" className="font-semibold text-[#150A56] underline underline-offset-2">{t("privacy.link")}</a></>}
                error={errors.privacyConsent?.message}
                registration={register("privacyConsent")}
              />
              <CheckboxField label={t("fields.contactConsent")} error={errors.contactConsent?.message} registration={register("contactConsent")} />
            </div>
          </div>
        </FormSection>
      )}

      <div className="mt-9 flex items-center justify-between gap-3 border-t border-slate-200 pt-6">
        {step > 0 ? <Button type="button" variant="outline" onClick={() => setStep((value) => value - 1)}><ArrowLeft aria-hidden="true" className="size-4" />{t("common.back")}</Button> : <span />}
        {step < 3 ? (
          <Button type="button" onClick={() => void nextStep()}>{t("common.continue")}<ArrowRight aria-hidden="true" className="size-4" /></Button>
        ) : (
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Check aria-hidden="true" className="size-5" />}
            {isSubmitting ? t("common.submitting") : t("common.submit")}
          </Button>
        )}
      </div>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-xs text-slate-500"><LockKeyhole aria-hidden="true" className="size-3.5" />{t("footer.secure")}</p>
    </form>
  );
}
