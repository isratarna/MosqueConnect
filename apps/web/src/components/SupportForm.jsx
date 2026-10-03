import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { MOSQUES } from "../data/mosques";
import {
  availabilityValue,
  BLOOD_AVAILABILITY,
  BLOOD_GROUPS,
  CONTACT_METHODS,
  CUSTOM_SUPPORT_TYPES,
  DELIVERY_METHODS,
  GOODS_CONDITIONS,
  MONEY_PURPOSES,
  PAYMENT_METHODS,
  PICKUP_DELIVERY_METHOD,
  VOLUNTEER_AVAILABILITY,
  WIDER_COMMUNITY,
} from "../data/supportFlow";
import { useAuth } from "../context/AuthContext";
import { useLocale } from "../hooks/useLocale";

const EMPTY_FORMS = {
  money: {
    mosque: "",
    campaign: "",
    amount: "",
    purpose: "",
    donorName: "",
    contact: "",
    anonymous: false,
    paymentMethod: "",
  },
  blood: {
    name: "",
    bloodGroup: "",
    location: "",
    phone: "",
    email: "",
    availability: "",
    lastDonationDate: "",
    preferredContact: "",
  },
  volunteer: {
    name: "",
    phone: "",
    email: "",
    preferredAvailability: [],
    relevantSkill: "",
    previousExperience: "",
    additionalNote: "",
  },
  goods: {
    itemName: "",
    quantity: "",
    condition: "",
    deliveryDate: "",
    deliveryMethod: "",
    phone: "",
    pickupAddress: "",
    pickupContact: "",
    additionalNote: "",
  },
  custom: {
    supportType: "",
    mosqueOrCommunity: "",
    supportTitle: "",
    description: "",
    availabilityDate: "",
    contactDetails: "",
    attachmentName: "",
  },
};

// Sample campaign names offered by this prototype form; like mosque names they
// are content, not interface text.
const ACTIVE_CAMPAIGNS = [
  "Roof Renovation Project",
  "Flood Victim Relief Packages",
];

function getInitialValues(type, user, initialData) {
  const name = user?.fullName || user?.name || "";
  const contact = user?.phone || user?.email || "";

  return {
    ...EMPTY_FORMS[type],
    ...(type === "money" ? { donorName: name, contact } : {}),
    ...(type === "blood" ? { name, phone: user?.phone || "", email: user?.email || "" } : {}),
    ...(type === "volunteer" ? { name, phone: user?.phone || "", email: user?.email || "" } : {}),
    ...initialData,
  };
}

function FieldError({ children }) {
  return <div className="invalid-feedback">{children}</div>;
}

function ActionButtons({ label, onCancel }) {
  const { t } = useLocale();

  return (
    <div className="mc-support-form__actions">
      <button type="button" className="btn btn-outline-mc" onClick={onCancel}>
        {t("common.cancel")}
      </button>
      <button type="submit" className="btn btn-mc">
        {label} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

// <option>s for a list of { value, labelKey } choices.
function Options({ options, t }) {
  return options.map((option) => <option key={option.value} value={option.value}>{t(option.labelKey)}</option>);
}

export default function SupportForm({ category, initialData, onCancel, onSubmit }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const [values, setValues] = useState(() => getInitialValues(category.key, user, initialData));
  const [validated, setValidated] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [availabilityGroup, setAvailabilityGroup] = useState(null);
  const availabilityPickerRef = useRef(null);
  const editingAttachment = Boolean(initialData?.attachmentName);
  const activeAvailabilityGroup = VOLUNTEER_AVAILABILITY.find((group) => group.key === availabilityGroup);

  useEffect(() => {
    const closeAvailabilityPicker = (event) => {
      const picker = availabilityPickerRef.current;
      if (picker?.open && !picker.contains(event.target)) {
        picker.open = false;
        setAvailabilityGroup(null);
      }
    };

    document.addEventListener("pointerdown", closeAvailabilityPicker);
    return () => document.removeEventListener("pointerdown", closeAvailabilityPicker);
  }, []);

  const setValue = (field) => (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === "deliveryMethod" && value !== PICKUP_DELIVERY_METHOD
        ? { pickupAddress: "", pickupContact: "" }
        : {}),
    }));
  };

  const toggleAvailability = (groupKey, slotKey) => () => {
    const value = availabilityValue(groupKey, slotKey);

    setAvailabilityError(false);
    setValues((current) => {
      const selected = current.preferredAvailability || [];
      const preferredAvailability = selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value];

      return { ...current, preferredAvailability };
    });
  };

  const handleAttachment = (event) => {
    setValues((current) => ({
      ...current,
      attachmentName: event.target.files[0]?.name || current.attachmentName,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const needsAvailability = category.key === "volunteer";
    const hasAvailability = !needsAvailability || values.preferredAvailability.length > 0;

    if (!form.checkValidity() || !hasAvailability) {
      setValidated(true);
      setAvailabilityError(!hasAvailability);
      if (hasAvailability) {
        form.querySelector(":invalid")?.focus();
      } else {
        availabilityPickerRef.current?.setAttribute("open", "");
        document.getElementById(fieldId("preferredAvailability-weekend"))?.focus();
      }
      return;
    }

    setAvailabilityError(false);
    onSubmit(values);
  };

  const fieldId = (field) => `support-${category.key}-${field}`;

  return (
    <form className={`mc-support-form ${validated ? "was-validated" : ""}`} noValidate onSubmit={handleSubmit}>
      {category.key === "money" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("mosque")}>{t("support.form.selectMosque")}</label>
              <select id={fieldId("mosque")} className="form-select" value={values.mosque} onChange={setValue("mosque")} required>
                <option value="">{t("support.form.chooseMosque")}</option>
                {MOSQUES.map((mosque) => <option key={mosque.id} value={mosque.name}>{mosque.name}</option>)}
              </select>
              <FieldError>{t("support.errors.mosque")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("campaign")}>{t("support.form.selectCampaign")}</label>
              <select id={fieldId("campaign")} className="form-select" value={values.campaign} onChange={setValue("campaign")} required>
                <option value="">{t("support.form.chooseCampaign")}</option>
                {ACTIVE_CAMPAIGNS.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
              </select>
              <FieldError>{t("support.errors.campaign")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("amount")}>{t("support.fields.amount")}</label>
              <input id={fieldId("amount")} type="number" min="1" step="1" className="form-control" placeholder={t("support.form.amountPlaceholder")} value={values.amount} onChange={setValue("amount")} required />
              <FieldError>{t("support.errors.amount")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("purpose")}>{t("support.fields.purpose")}</label>
              <select id={fieldId("purpose")} className="form-select" value={values.purpose} onChange={setValue("purpose")} required>
                <option value="">{t("support.form.choosePurpose")}</option>
                <Options options={MONEY_PURPOSES} t={t} />
              </select>
              <FieldError>{t("support.errors.purpose")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("donorName")}>{t("support.fields.donorName")}</label>
              <input id={fieldId("donorName")} type="text" className="form-control" value={values.donorName} onChange={setValue("donorName")} required />
              <FieldError>{t("support.errors.name")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("contact")}>{t("support.fields.contact")}</label>
              <input id={fieldId("contact")} type="text" className="form-control" placeholder={t("support.form.contactPlaceholder")} value={values.contact} onChange={setValue("contact")} required />
              <FieldError>{t("support.errors.contact")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("paymentMethod")}>{t("support.fields.paymentMethod")}</label>
              <select id={fieldId("paymentMethod")} className="form-select" value={values.paymentMethod} onChange={setValue("paymentMethod")} required>
                <option value="">{t("support.form.choosePayment")}</option>
                <Options options={PAYMENT_METHODS} t={t} />
              </select>
              <FieldError>{t("support.errors.payment")}</FieldError>
            </div>
          </div>
          <div className="form-check mt-3">
            <input id={fieldId("anonymous")} type="checkbox" className="form-check-input" checked={values.anonymous} onChange={setValue("anonymous")} />
            <label className="form-check-label" htmlFor={fieldId("anonymous")}>{t("support.form.anonymousCheck")}</label>
          </div>
          <p className="form-text mb-0">{t("support.form.moneyNote")}</p>
        </>
      )}

      {category.key === "blood" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("name")}>{t("support.fields.name")}</label>
              <input id={fieldId("name")} type="text" className="form-control" value={values.name} onChange={setValue("name")} required />
              <FieldError>{t("support.errors.name")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("bloodGroup")}>{t("support.fields.bloodGroup")}</label>
              <select id={fieldId("bloodGroup")} className="form-select" value={values.bloodGroup} onChange={setValue("bloodGroup")} required>
                <option value="">{t("support.form.selectBloodGroup")}</option>
                {BLOOD_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
              <FieldError>{t("support.errors.bloodGroup")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("location")}>{t("support.fields.location")}</label>
              <input id={fieldId("location")} type="text" className="form-control" placeholder={t("support.form.locationPlaceholder")} value={values.location} onChange={setValue("location")} required />
              <FieldError>{t("support.errors.location")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("phone")}>{t("support.fields.phone")}</label>
              <input id={fieldId("phone")} type="tel" className="form-control" value={values.phone} onChange={setValue("phone")} required />
              <FieldError>{t("support.errors.phone")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("email")}>{t("support.fields.email")}</label>
              <input id={fieldId("email")} type="email" className="form-control" value={values.email} onChange={setValue("email")} required />
              <FieldError>{t("support.errors.email")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("availability")}>{t("support.fields.availability")}</label>
              <select id={fieldId("availability")} className="form-select" value={values.availability} onChange={setValue("availability")} required>
                <option value="">{t("support.form.selectAvailability")}</option>
                <Options options={BLOOD_AVAILABILITY} t={t} />
              </select>
              <FieldError>{t("support.errors.availability")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("lastDonationDate")}>{t("support.fields.lastDonationDate")}</label>
              <input id={fieldId("lastDonationDate")} type="date" className="form-control" value={values.lastDonationDate} onChange={setValue("lastDonationDate")} required />
              <FieldError>{t("support.errors.lastDonationDate")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("preferredContact")}>{t("support.fields.preferredContact")}</label>
              <select id={fieldId("preferredContact")} className="form-select" value={values.preferredContact} onChange={setValue("preferredContact")} required>
                <option value="">{t("support.form.chooseContact")}</option>
                <Options options={CONTACT_METHODS} t={t} />
              </select>
              <FieldError>{t("support.errors.preferredContact")}</FieldError>
            </div>
          </div>
          <p className="form-text mb-0">{t("support.form.bloodNote")}</p>
        </>
      )}

      {category.key === "volunteer" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("name")}>{t("support.fields.name")}</label>
              <input id={fieldId("name")} type="text" className="form-control" value={values.name} onChange={setValue("name")} required />
              <FieldError>{t("support.errors.name")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("phone")}>{t("support.fields.phoneNumber")}</label>
              <input id={fieldId("phone")} type="tel" className="form-control" value={values.phone} onChange={setValue("phone")} required />
              <FieldError>{t("support.errors.phone")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("email")}>{t("support.fields.email")}</label>
              <input id={fieldId("email")} type="email" className="form-control" value={values.email} onChange={setValue("email")} required />
              <FieldError>{t("support.errors.email")}</FieldError>
            </div>
            <div className="col-md-6 mc-support-availability-field" role="group" aria-labelledby={fieldId("preferredAvailability-label")} aria-invalid={availabilityError}>
              <label id={fieldId("preferredAvailability-label")} className="form-label">{t("support.fields.preferredAvailability")}</label>
              <details
                ref={availabilityPickerRef}
                className="mc-support-availability"
                onToggle={(event) => !event.currentTarget.open && setAvailabilityGroup(null)}
              >
                <summary className="form-select mc-support-availability__toggle">
                  {values.preferredAvailability.length
                    ? t("support.form.slotsSelected", { count: values.preferredAvailability.length })
                    : t("support.form.selectAvailability")}
                </summary>
                <div className="mc-support-availability__menu">
                {!activeAvailabilityGroup ? (
                  VOLUNTEER_AVAILABILITY.map((group) => (
                    <button
                      id={fieldId(`preferredAvailability-${group.key}`)}
                      className="mc-support-availability__group-option"
                      type="button"
                      key={group.key}
                      onClick={() => setAvailabilityGroup(group.key)}
                    >
                      {t(group.labelKey)} <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      className="mc-support-availability__back"
                      type="button"
                      onClick={() => setAvailabilityGroup(null)}
                    >
                      <ChevronLeft size={15} aria-hidden="true" /> {t("support.form.allAvailability")}
                    </button>
                    <div className="mc-support-availability__group">
                      <p className="mc-support-availability__group-title">{t(activeAvailabilityGroup.labelKey)}</p>
                      {activeAvailabilityGroup.slots.map((slot) => {
                        const value = availabilityValue(activeAvailabilityGroup.key, slot.key);
                        const id = fieldId(`preferredAvailability-${activeAvailabilityGroup.key}-${slot.key}`);

                        return (
                          <div className="form-check" key={value}>
                            <input
                              id={id}
                              className="form-check-input"
                              type="checkbox"
                              checked={values.preferredAvailability.includes(value)}
                              onChange={toggleAvailability(activeAvailabilityGroup.key, slot.key)}
                            />
                            <label className="form-check-label" htmlFor={id}>{t(slot.labelKey)}</label>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                </div>
              </details>
              {availabilityError && <p className="invalid-feedback d-block mb-0">{t("support.errors.availabilitySlot")}</p>}
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("relevantSkill")}>{t("support.fields.relevantSkill")}</label>
              <input id={fieldId("relevantSkill")} type="text" className="form-control" value={values.relevantSkill} onChange={setValue("relevantSkill")} required />
              <FieldError>{t("support.errors.skill")}</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("previousExperience")}>{t("support.fields.previousExperience")}</label>
              <textarea id={fieldId("previousExperience")} className="form-control" rows="3" value={values.previousExperience} onChange={setValue("previousExperience")} required />
              <FieldError>{t("support.errors.experience")}</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("additionalNote")}>{t("support.fields.additionalNote")} <span className="text-muted">{t("common.optional")}</span></label>
              <textarea id={fieldId("additionalNote")} className="form-control" rows="2" value={values.additionalNote} onChange={setValue("additionalNote")} />
            </div>
          </div>
          <p className="form-text mb-0">{t("support.form.volunteerNote")}</p>
        </>
      )}

      {category.key === "goods" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("itemName")}>{t("support.fields.itemName")}</label>
              <input id={fieldId("itemName")} type="text" className="form-control" value={values.itemName} onChange={setValue("itemName")} required />
              <FieldError>{t("support.errors.itemName")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("quantity")}>{t("support.fields.quantity")}</label>
              <input id={fieldId("quantity")} type="number" min="1" step="1" className="form-control" value={values.quantity} onChange={setValue("quantity")} required />
              <FieldError>{t("support.errors.quantity")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("condition")}>{t("support.fields.condition")}</label>
              <select id={fieldId("condition")} className="form-select" value={values.condition} onChange={setValue("condition")} required>
                <option value="">{t("support.form.chooseCondition")}</option>
                <Options options={GOODS_CONDITIONS} t={t} />
              </select>
              <FieldError>{t("support.errors.condition")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("deliveryDate")}>{t("support.fields.deliveryDate")}</label>
              <input id={fieldId("deliveryDate")} type="date" className="form-control" value={values.deliveryDate} onChange={setValue("deliveryDate")} required />
              <FieldError>{t("support.errors.deliveryDate")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("deliveryMethod")}>{t("support.fields.deliveryMethod")}</label>
              <select id={fieldId("deliveryMethod")} className="form-select" value={values.deliveryMethod} onChange={setValue("deliveryMethod")} required>
                <option value="">{t("support.form.chooseDelivery")}</option>
                <Options options={DELIVERY_METHODS} t={t} />
              </select>
              <FieldError>{t("support.errors.deliveryMethod")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("phone")}>{t("support.fields.phoneNumber")}</label>
              <input id={fieldId("phone")} type="tel" className="form-control" value={values.phone} onChange={setValue("phone")} required />
              <FieldError>{t("support.errors.phone")}</FieldError>
            </div>
            {values.deliveryMethod === PICKUP_DELIVERY_METHOD && (
              <>
                <div className="col-md-7">
                  <label className="form-label" htmlFor={fieldId("pickupAddress")}>{t("support.fields.pickupAddress")}</label>
                  <textarea id={fieldId("pickupAddress")} className="form-control" rows="2" placeholder={t("support.form.pickupAddressPlaceholder")} value={values.pickupAddress} onChange={setValue("pickupAddress")} required />
                  <FieldError>{t("support.errors.pickupAddress")}</FieldError>
                </div>
                <div className="col-md-5">
                  <label className="form-label" htmlFor={fieldId("pickupContact")}>{t("support.fields.pickupContact")}</label>
                  <input id={fieldId("pickupContact")} type="tel" className="form-control" placeholder={t("support.form.pickupContactPlaceholder")} value={values.pickupContact} onChange={setValue("pickupContact")} required />
                  <FieldError>{t("support.errors.pickupContact")}</FieldError>
                </div>
              </>
            )}
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("additionalNote")}>{t("support.fields.additionalNote")} <span className="text-muted">{t("common.optional")}</span></label>
              <textarea id={fieldId("additionalNote")} className="form-control" rows="2" value={values.additionalNote} onChange={setValue("additionalNote")} />
            </div>
          </div>
          <p className="form-text mb-0">{t("support.form.goodsNote")}</p>
        </>
      )}

      {category.key === "custom" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("supportType")}>{t("support.fields.supportType")}</label>
              <select id={fieldId("supportType")} className="form-select" value={values.supportType} onChange={setValue("supportType")} required>
                <option value="">{t("support.form.chooseSupportType")}</option>
                <Options options={CUSTOM_SUPPORT_TYPES} t={t} />
              </select>
              <FieldError>{t("support.errors.supportType")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("mosqueOrCommunity")}>{t("support.form.selectedMosqueOrCommunity")}</label>
              <select id={fieldId("mosqueOrCommunity")} className="form-select" value={values.mosqueOrCommunity} onChange={setValue("mosqueOrCommunity")} required>
                <option value="">{t("support.form.chooseMosqueOrCommunity")}</option>
                <option value={WIDER_COMMUNITY}>{t("support.options.widerCommunity")}</option>
                {MOSQUES.map((mosque) => <option key={mosque.id} value={mosque.name}>{mosque.name}</option>)}
              </select>
              <FieldError>{t("support.errors.mosqueOrCommunity")}</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("supportTitle")}>{t("support.fields.supportTitle")}</label>
              <input id={fieldId("supportTitle")} type="text" className="form-control" value={values.supportTitle} onChange={setValue("supportTitle")} required />
              <FieldError>{t("support.errors.supportTitle")}</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("description")}>{t("support.fields.description")}</label>
              <textarea id={fieldId("description")} className="form-control" rows="3" value={values.description} onChange={setValue("description")} required />
              <FieldError>{t("support.errors.description")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("availabilityDate")}>{t("support.fields.availabilityDate")}</label>
              <input id={fieldId("availabilityDate")} type="date" className="form-control" value={values.availabilityDate} onChange={setValue("availabilityDate")} required />
              <FieldError>{t("support.errors.availabilityDate")}</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("contactDetails")}>{t("support.fields.contactDetails")}</label>
              <input id={fieldId("contactDetails")} type="text" className="form-control" placeholder={t("support.form.contactPlaceholder")} value={values.contactDetails} onChange={setValue("contactDetails")} required />
              <FieldError>{t("support.errors.contactDetails")}</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("attachment")}>{t("support.fields.attachment")}</label>
              <input id={fieldId("attachment")} type="file" className="form-control" onChange={handleAttachment} required={!editingAttachment} />
              {editingAttachment && <p className="form-text mb-0">{t("support.form.previouslySelected", { name: values.attachmentName })}</p>}
              <FieldError>{t("support.errors.attachFile")}</FieldError>
            </div>
          </div>
          <p className="form-text mb-0">{t("support.form.customNote")}</p>
        </>
      )}

      <ActionButtons label={t(category.actionLabelKey)} onCancel={onCancel} />
    </form>
  );
}
