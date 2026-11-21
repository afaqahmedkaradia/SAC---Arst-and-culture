import { COUNTRIES, FAMILY_RELATIONSHIPS } from "@/lib/constants";

export type CommunityDetails = {
  jamatkhana: string | null;
  country_of_birth: string | null;
  country_of_residence: string | null;
  multifaith: boolean;
  family_relationship: string | null;
  family_member_name: string | null;
  family_jamatkhana: string | null;
};

const val = (form: FormData, name: string, max: number) => {
  const v = String(form.get(name) ?? "").trim().replace(/\s+/g, " ").slice(0, max);
  return v || null;
};

// Reads and checks the community questions. Used by sign-up and by profile settings.
export function readCommunity(form: FormData): { data?: CommunityDetails; error?: string } {
  const multifaith = form.get("multifaith") === "on";
  const data: CommunityDetails = {
    jamatkhana: val(form, "jamatkhana", 120),
    country_of_birth: val(form, "country_of_birth", 80),
    country_of_residence: val(form, "country_of_residence", 80),
    multifaith,
    family_relationship: multifaith ? val(form, "family_relationship", 40) : null,
    family_member_name: multifaith ? val(form, "family_member_name", 80) : null,
    family_jamatkhana: multifaith ? val(form, "family_jamatkhana", 120) : null,
  };
  const isCountry = (c: string | null) => !!c && (COUNTRIES as readonly string[]).includes(c);
  if (!isCountry(data.country_of_birth)) return { error: "Please choose your country of birth." };
  if (!isCountry(data.country_of_residence)) return { error: "Please choose the country you live in." };
  if (!multifaith && !data.jamatkhana) {
    return { error: "Please tell us which Jamatkhana you attend, or fill in the multi-faith family section." };
  }
  if (multifaith) {
    if (!data.family_relationship || !(FAMILY_RELATIONSHIPS as readonly string[]).includes(data.family_relationship)) {
      return { error: "Please choose how you're related to your Ismaili family member." };
    }
    if (!data.jamatkhana && !data.family_jamatkhana) {
      return { error: "Please add the Jamatkhana your family member attends." };
    }
  }
  return { data };
}
