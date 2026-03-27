/* ---------------------------------------------------------------
   Step 1 — Personal Details
   ---------------------------------------------------------------*/

export function renderStepBasic(): string {
  return `
    <div class="fdiv">Personal Details</div>

    <div class="frow">
      <div class="fg">
        <label class="flbl req" for="f-fn">First Name</label>
        <input class="fi" id="f-fn" type="text" name="firstName"
               autocomplete="given-name" inputmode="text"
               placeholder="e.g. Thabo"
               aria-required="true" aria-label="First name" />
      </div>
      <div class="fg">
        <label class="flbl req" for="f-sn">Surname</label>
        <input class="fi" id="f-sn" type="text" name="surname"
               autocomplete="family-name" inputmode="text"
               placeholder="e.g. Mokoena"
               aria-required="true" aria-label="Surname" />
      </div>
    </div>

    <div class="frow">
      <div class="fg">
        <label class="flbl req" for="f-em">Email Address</label>
        <input class="fi" id="f-em" type="email" name="email"
               autocomplete="email" inputmode="email"
               placeholder="you@company.co.za"
               aria-required="true" aria-label="Email address" />
      </div>
      <div class="fg">
        <label class="flbl req" for="f-ph">Phone Number</label>
        <input class="fi" id="f-ph" type="tel" name="phone"
               autocomplete="tel" inputmode="tel"
               placeholder="+27 XX XXX XXXX"
               aria-required="true" aria-label="Phone number" />
      </div>
    </div>

    <div class="fg">
      <label class="flbl" for="f-co">Company / Organisation <span class="flbl-hint">(optional)</span></label>
      <input class="fi" id="f-co" type="text" name="companyName"
             autocomplete="organization" inputmode="text"
             placeholder="e.g. Mokoena Developments (Pty) Ltd"
             aria-required="false" aria-label="Company or organisation name" />
    </div>`;
}
