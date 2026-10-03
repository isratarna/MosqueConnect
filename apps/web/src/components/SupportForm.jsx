import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { MOSQUES } from "../data/mosques";
import { useAuth } from "../context/AuthContext";

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

const ACTIVE_CAMPAIGNS = [
  "Roof Renovation Project",
  "Flood Victim Relief Packages",
];

const PICKUP_DELIVERY_METHOD = "Request pickup from my location";

const VOLUNTEER_AVAILABILITY = [
  { label: "Weekend", slots: ["Morning", "Afternoon", "Evening"] },
  { label: "Weekday", slots: ["Morning", "Afternoon", "Evening"] },
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
  return (
    <div className="mc-support-form__actions">
      <button type="button" className="btn btn-outline-mc" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="btn btn-mc">
        {label} <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export default function SupportForm({ category, initialData, onCancel, onSubmit }) {
  const { user } = useAuth();
  const [values, setValues] = useState(() => getInitialValues(category.key, user, initialData));
  const [validated, setValidated] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [availabilityGroup, setAvailabilityGroup] = useState(null);
  const availabilityPickerRef = useRef(null);
  const editingAttachment = Boolean(initialData?.attachmentName);
  const activeAvailabilityGroup = VOLUNTEER_AVAILABILITY.find((group) => group.label === availabilityGroup);

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

  const toggleAvailability = (group, slot) => () => {
    const value = `${group} — ${slot}`;

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
              <label className="form-label" htmlFor={fieldId("mosque")}>Select mosque</label>
              <select id={fieldId("mosque")} className="form-select" value={values.mosque} onChange={setValue("mosque")} required>
                <option value="">Choose a mosque</option>
                {MOSQUES.map((mosque) => <option key={mosque.id} value={mosque.name}>{mosque.name}</option>)}
              </select>
              <FieldError>Please select a mosque.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("campaign")}>Select campaign</label>
              <select id={fieldId("campaign")} className="form-select" value={values.campaign} onChange={setValue("campaign")} required>
                <option value="">Choose a campaign</option>
                {ACTIVE_CAMPAIGNS.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
              </select>
              <FieldError>Please select a campaign.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("amount")}>Amount</label>
              <input id={fieldId("amount")} type="number" min="1" step="1" className="form-control" placeholder="Enter amount" value={values.amount} onChange={setValue("amount")} required />
              <FieldError>Please enter a donation amount.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("purpose")}>Purpose</label>
              <select id={fieldId("purpose")} className="form-select" value={values.purpose} onChange={setValue("purpose")} required>
                <option value="">Choose a purpose</option>
                {["Zakat", "Charity", "Construction", "Maintenance", "Others"].map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
              </select>
              <FieldError>Please choose a purpose.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("donorName")}>Donor name</label>
              <input id={fieldId("donorName")} type="text" className="form-control" value={values.donorName} onChange={setValue("donorName")} required />
              <FieldError>Please enter your name.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("contact")}>Phone or email</label>
              <input id={fieldId("contact")} type="text" className="form-control" placeholder="Phone number or email address" value={values.contact} onChange={setValue("contact")} required />
              <FieldError>Please provide a phone number or email address.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("paymentMethod")}>Payment method</label>
              <select id={fieldId("paymentMethod")} className="form-select" value={values.paymentMethod} onChange={setValue("paymentMethod")} required>
                <option value="">Choose a payment method</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
              <FieldError>Please choose a payment method.</FieldError>
            </div>
          </div>
          <div className="form-check mt-3">
            <input id={fieldId("anonymous")} type="checkbox" className="form-check-input" checked={values.anonymous} onChange={setValue("anonymous")} />
            <label className="form-check-label" htmlFor={fieldId("anonymous")}>Make this an anonymous donation</label>
          </div>
          <p className="form-text mb-0">You will review these details before any payment step. No payment is taken yet.</p>
        </>
      )}

      {category.key === "blood" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("name")}>Name</label>
              <input id={fieldId("name")} type="text" className="form-control" value={values.name} onChange={setValue("name")} required />
              <FieldError>Please enter your name.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("bloodGroup")}>Blood group</label>
              <select id={fieldId("bloodGroup")} className="form-select" value={values.bloodGroup} onChange={setValue("bloodGroup")} required>
                <option value="">Select blood group</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group} value={group}>{group}</option>)}
              </select>
              <FieldError>Please select your blood group.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("location")}>Location</label>
              <input id={fieldId("location")} type="text" className="form-control" placeholder="Your area or city" value={values.location} onChange={setValue("location")} required />
              <FieldError>Please enter your location.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("phone")}>Phone</label>
              <input id={fieldId("phone")} type="tel" className="form-control" value={values.phone} onChange={setValue("phone")} required />
              <FieldError>Please enter your phone number.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("email")}>Email</label>
              <input id={fieldId("email")} type="email" className="form-control" value={values.email} onChange={setValue("email")} required />
              <FieldError>Please enter a valid email address.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("availability")}>Availability</label>
              <select id={fieldId("availability")} className="form-select" value={values.availability} onChange={setValue("availability")} required>
                <option value="">Select availability</option>
                <option value="Available now">Available now</option>
                <option value="Available this week">Available this week</option>
                <option value="Available later">Available later</option>
              </select>
              <FieldError>Please select your availability.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("lastDonationDate")}>Last donation date</label>
              <input id={fieldId("lastDonationDate")} type="date" className="form-control" value={values.lastDonationDate} onChange={setValue("lastDonationDate")} required />
              <FieldError>Please select your last donation date.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("preferredContact")}>Preferred contact method</label>
              <select id={fieldId("preferredContact")} className="form-select" value={values.preferredContact} onChange={setValue("preferredContact")} required>
                <option value="">Choose a contact method</option>
                <option value="Phone">Phone</option>
                <option value="Email">Email</option>
              </select>
              <FieldError>Please choose a preferred contact method.</FieldError>
            </div>
          </div>
          <p className="form-text mb-0">No donor registration is submitted from this prototype.</p>
        </>
      )}

      {category.key === "volunteer" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("name")}>Name</label>
              <input id={fieldId("name")} type="text" className="form-control" value={values.name} onChange={setValue("name")} required />
              <FieldError>Please enter your name.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("phone")}>Phone number</label>
              <input id={fieldId("phone")} type="tel" className="form-control" value={values.phone} onChange={setValue("phone")} required />
              <FieldError>Please enter your phone number.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("email")}>Email</label>
              <input id={fieldId("email")} type="email" className="form-control" value={values.email} onChange={setValue("email")} required />
              <FieldError>Please enter a valid email address.</FieldError>
            </div>
            <div className="col-md-6 mc-support-availability-field" role="group" aria-labelledby={fieldId("preferredAvailability-label")} aria-invalid={availabilityError}>
              <label id={fieldId("preferredAvailability-label")} className="form-label">Preferred availability</label>
              <details
                ref={availabilityPickerRef}
                className="mc-support-availability"
                onToggle={(event) => !event.currentTarget.open && setAvailabilityGroup(null)}
              >
                <summary className="form-select mc-support-availability__toggle">
                  {values.preferredAvailability.length
                    ? `${values.preferredAvailability.length} time slot${values.preferredAvailability.length === 1 ? "" : "s"} selected`
                    : "Select availability"}
                </summary>
                <div className="mc-support-availability__menu">
                {!activeAvailabilityGroup ? (
                  VOLUNTEER_AVAILABILITY.map((group) => (
                    <button
                      id={fieldId(`preferredAvailability-${group.label.toLowerCase()}`)}
                      className="mc-support-availability__group-option"
                      type="button"
                      key={group.label}
                      onClick={() => setAvailabilityGroup(group.label)}
                    >
                      {group.label} <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  ))
                ) : (
                  <>
                    <button
                      className="mc-support-availability__back"
                      type="button"
                      onClick={() => setAvailabilityGroup(null)}
                    >
                      <ChevronLeft size={15} aria-hidden="true" /> All availability
                    </button>
                    {VOLUNTEER_AVAILABILITY.filter((group) => group.label === activeAvailabilityGroup.label).map((group) => (
                  <div className="mc-support-availability__group" key={group.label}>
                      <p className="mc-support-availability__group-title">{group.label}</p>
                      {group.slots.map((slot) => {
                        const value = `${group.label} — ${slot}`;
                        const id = fieldId(`preferredAvailability-${group.label.toLowerCase()}-${slot.toLowerCase()}`);

                        return (
                          <div className="form-check" key={value}>
                            <input
                              id={id}
                              className="form-check-input"
                              type="checkbox"
                              checked={values.preferredAvailability.includes(value)}
                              onChange={toggleAvailability(group.label, slot)}
                            />
                            <label className="form-check-label" htmlFor={id}>{slot}</label>
                          </div>
                        );
                      })}
                  </div>
                    ))}
                  </>
                )}
                </div>
              </details>
              {availabilityError && <p className="invalid-feedback d-block mb-0">Select at least one available time slot.</p>}
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("relevantSkill")}>Relevant skill</label>
              <input id={fieldId("relevantSkill")} type="text" className="form-control" value={values.relevantSkill} onChange={setValue("relevantSkill")} required />
              <FieldError>Please enter a relevant skill.</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("previousExperience")}>Previous experience</label>
              <textarea id={fieldId("previousExperience")} className="form-control" rows="3" value={values.previousExperience} onChange={setValue("previousExperience")} required />
              <FieldError>Please share your previous experience.</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("additionalNote")}>Additional note <span className="text-muted">(optional)</span></label>
              <textarea id={fieldId("additionalNote")} className="form-control" rows="2" value={values.additionalNote} onChange={setValue("additionalNote")} />
            </div>
          </div>
          <p className="form-text mb-0">This step prepares your application details only; it does not submit an application.</p>
        </>
      )}

      {category.key === "goods" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("itemName")}>Item name</label>
              <input id={fieldId("itemName")} type="text" className="form-control" value={values.itemName} onChange={setValue("itemName")} required />
              <FieldError>Please enter the item name.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("quantity")}>Quantity</label>
              <input id={fieldId("quantity")} type="number" min="1" step="1" className="form-control" value={values.quantity} onChange={setValue("quantity")} required />
              <FieldError>Please enter a quantity of at least one.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("condition")}>Item condition</label>
              <select id={fieldId("condition")} className="form-select" value={values.condition} onChange={setValue("condition")} required>
                <option value="">Choose item condition</option>
                <option value="New">New</option>
                <option value="Gently Used">Gently Used</option>
                <option value="Used">Used</option>
              </select>
              <FieldError>Please select the item condition.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("deliveryDate")}>Expected delivery date</label>
              <input id={fieldId("deliveryDate")} type="date" className="form-control" value={values.deliveryDate} onChange={setValue("deliveryDate")} required />
              <FieldError>Please select an expected delivery date.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("deliveryMethod")}>Delivery method</label>
              <select id={fieldId("deliveryMethod")} className="form-select" value={values.deliveryMethod} onChange={setValue("deliveryMethod")} required>
                <option value="">Choose a delivery method</option>
                <option value="I will deliver to the mosque">I will deliver to the mosque</option>
                <option value={PICKUP_DELIVERY_METHOD}>{PICKUP_DELIVERY_METHOD}</option>
                <option value="Need to discuss with the mosque">Need to discuss with the mosque</option>
              </select>
              <FieldError>Please choose a delivery method.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("phone")}>Phone number</label>
              <input id={fieldId("phone")} type="tel" className="form-control" value={values.phone} onChange={setValue("phone")} required />
              <FieldError>Please enter your phone number.</FieldError>
            </div>
            {values.deliveryMethod === PICKUP_DELIVERY_METHOD && (
              <>
                <div className="col-md-7">
                  <label className="form-label" htmlFor={fieldId("pickupAddress")}>Pickup address</label>
                  <textarea id={fieldId("pickupAddress")} className="form-control" rows="2" placeholder="Enter the pickup location" value={values.pickupAddress} onChange={setValue("pickupAddress")} required />
                  <FieldError>Please enter a pickup address.</FieldError>
                </div>
                <div className="col-md-5">
                  <label className="form-label" htmlFor={fieldId("pickupContact")}>Pickup contact</label>
                  <input id={fieldId("pickupContact")} type="tel" className="form-control" placeholder="Name or phone number" value={values.pickupContact} onChange={setValue("pickupContact")} required />
                  <FieldError>Please enter a pickup contact.</FieldError>
                </div>
              </>
            )}
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("additionalNote")}>Additional note <span className="text-muted">(optional)</span></label>
              <textarea id={fieldId("additionalNote")} className="form-control" rows="2" value={values.additionalNote} onChange={setValue("additionalNote")} />
            </div>
          </div>
          <p className="form-text mb-0">A mosque administrator would confirm item receipt in the future. No donation is recorded yet.</p>
        </>
      )}

      {category.key === "custom" && (
        <>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("supportType")}>Support type</label>
              <select id={fieldId("supportType")} className="form-select" value={values.supportType} onChange={setValue("supportType")} required>
                <option value="">Choose support type</option>
                {[
                  "Sponsor an event",
                  "Sponsor an Islamic class",
                  "Support an orphan program",
                  "Provide a professional service",
                  "Donate equipment",
                  "Provide transportation",
                  "Others",
                ].map((supportType) => <option key={supportType} value={supportType}>{supportType}</option>)}
              </select>
              <FieldError>Please choose a support type.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("mosqueOrCommunity")}>Selected mosque or community</label>
              <select id={fieldId("mosqueOrCommunity")} className="form-select" value={values.mosqueOrCommunity} onChange={setValue("mosqueOrCommunity")} required>
                <option value="">Choose a mosque or community</option>
                <option value="Wider MosqueConnect community">Wider MosqueConnect community</option>
                {MOSQUES.map((mosque) => <option key={mosque.id} value={mosque.name}>{mosque.name}</option>)}
              </select>
              <FieldError>Please choose a mosque or community.</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("supportTitle")}>Support title</label>
              <input id={fieldId("supportTitle")} type="text" className="form-control" value={values.supportTitle} onChange={setValue("supportTitle")} required />
              <FieldError>Please enter a support title.</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("description")}>Description</label>
              <textarea id={fieldId("description")} className="form-control" rows="3" value={values.description} onChange={setValue("description")} required />
              <FieldError>Please describe the support you would like to offer.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("availabilityDate")}>Availability or preferred date</label>
              <input id={fieldId("availabilityDate")} type="date" className="form-control" value={values.availabilityDate} onChange={setValue("availabilityDate")} required />
              <FieldError>Please select an availability or preferred date.</FieldError>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor={fieldId("contactDetails")}>Contact details</label>
              <input id={fieldId("contactDetails")} type="text" className="form-control" placeholder="Phone number or email address" value={values.contactDetails} onChange={setValue("contactDetails")} required />
              <FieldError>Please enter your contact details.</FieldError>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor={fieldId("attachment")}>Attachment</label>
              <input id={fieldId("attachment")} type="file" className="form-control" onChange={handleAttachment} required={!editingAttachment} />
              {editingAttachment && <p className="form-text mb-0">Previously selected: {values.attachmentName}. Choose another file only to replace it.</p>}
              <FieldError>Please attach a file.</FieldError>
            </div>
          </div>
          <p className="form-text mb-0">The attachment name is kept only for this frontend review and is not uploaded.</p>
        </>
      )}

      <ActionButtons label={category.actionLabel} onCancel={onCancel} />
    </form>
  );
}
