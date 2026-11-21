"use client";

import { useState } from "react";
import { COUNTRIES, FAMILY_RELATIONSHIPS } from "@/lib/constants";
import type { CommunityDetails } from "@/lib/community";

// Jamatkhana, countries and the optional multi-faith family section.
// Shown to artists at sign-up and in profile settings. The answers are private.
export function CommunityFields({ initial, idPrefix = "cm" }: { initial?: Partial<CommunityDetails> | null; idPrefix?: string }) {
  const [multifaith, setMultifaith] = useState(!!initial?.multifaith);
  const id = (s: string) => `${idPrefix}-${s}`;
  const countryOptions = (
    <>
      <option value="">Choose a country</option>
      <option value="Canada">Canada</option>
      <option disabled>──────────</option>
      {COUNTRIES.filter((c) => c !== "Canada").map((c) => <option key={c} value={c}>{c}</option>)}
    </>
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={id("jk")} className="label">
          Jamatkhana you attend {multifaith && <span className="font-normal text-muted">(optional)</span>}
        </label>
        <input id={id("jk")} name="jamatkhana" defaultValue={initial?.jamatkhana ?? ""} required={!multifaith} maxLength={120} className="input" placeholder="Name and city of your Jamatkhana" />
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <div>
          <label htmlFor={id("cob")} className="label">Country of birth</label>
          <select id={id("cob")} name="country_of_birth" defaultValue={initial?.country_of_birth ?? ""} required className="input">{countryOptions}</select>
        </div>
        <div>
          <label htmlFor={id("cor")} className="label">Country you live in</label>
          <select id={id("cor")} name="country_of_residence" defaultValue={initial?.country_of_residence ?? "Canada"} required className="input">{countryOptions}</select>
        </div>
      </div>

      <div className="flex flex-col gap-3 border border-line rounded-[12px] p-4 bg-white">
        <label className="flex gap-2.5 items-start text-sm leading-normal text-body cursor-pointer">
          <input type="checkbox" name="multifaith" checked={multifaith} onChange={(e) => setMultifaith(e.target.checked)} className="w-5 h-5 m-0 accent-accent shrink-0" />
          <span>
            <b className="text-ink">Multi-faith family</b> <span className="text-muted">(optional)</span><br />
            Tick this if you are part of an Ismaili family, for example through a spouse or parent.
          </span>
        </label>
        {multifaith && (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <div>
              <label htmlFor={id("rel")} className="label">Your Ismaili family member is your</label>
              <select id={id("rel")} name="family_relationship" defaultValue={initial?.family_relationship ?? ""} required className="input">
                <option value="">Choose one</option>
                {FAMILY_RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={id("fname")} className="label">Their name <span className="font-normal text-muted">(optional)</span></label>
              <input id={id("fname")} name="family_member_name" defaultValue={initial?.family_member_name ?? ""} maxLength={80} className="input" />
            </div>
            <div className="col-span-full">
              <label htmlFor={id("fjk")} className="label">Jamatkhana they attend</label>
              <input id={id("fjk")} name="family_jamatkhana" defaultValue={initial?.family_jamatkhana ?? ""} maxLength={120} className="input" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
