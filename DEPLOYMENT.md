# MosqueConnect — Deployed Environment

The application runs in Azure and stays online whether or not this computer is
on. Closing VS Code, the terminal, or Docker Desktop does not affect it.

## Live URLs

- **Website:** https://mc-web.politedune-07ecd987.uaenorth.azurecontainerapps.io
- **API:** https://mc-api.politedune-07ecd987.uaenorth.azurecontainerapps.io

Open the website in any browser, on any device, anywhere. Nothing needs to be
installed or running locally to use it.

## Logging in

The deployed API does not send real SMS. It writes the one-time password to its
logs instead, so signing in is a two-part process.

1. Open the website and enter a phone number in international format, starting
   with `+` and the country code, for example `+8801712345678`. A number such as
   `01712345678` is rejected by the validator before any code is issued.
2. Retrieve the code (see below).
3. Enter the code on the site. It expires five minutes after it was issued, and
   sending is limited to five requests per minute.

The first successful login for a phone number creates that account.

### Retrieving the code — with the terminal

From this project folder, in PowerShell:

    .\get-otp.ps1

The script locates the Azure CLI on its own and prints the most recent code. It
requires the Azure CLI to be installed and `az login` to have been completed as
`isratjahanarna@gmail.com`. That sign-in persists across reboots, so it normally
only has to be done once per machine.

If the Azure CLI is missing on a new machine:

    winget install --exact --id Microsoft.AzureCLI
    az config set core.enable_broker_on_windows=false
    az login

The `enable_broker_on_windows` setting must be applied *before* signing in.
Without it the Windows account popup fails silently and no token is saved.

### Retrieving the code — without the terminal

The code can also be read from the Azure Portal, which needs nothing installed:

1. Go to https://portal.azure.com and sign in.
2. Open the resource group `mosqueconnect-rg`, then the container app `mc-api`.
3. Select **Monitoring → Log stream**.
4. Request a code on the website and watch for a line reading
   `Local phone OTP generated.` containing the phone number and code.

## Azure resources

All resources live in the resource group `mosqueconnect-rg`, in the
subscription *Azure for Students*.

| Resource | Name | Region |
| --- | --- | --- |
| Container app (frontend) | `mc-web` | UAE North |
| Container app (API) | `mc-api` | UAE North |
| Container Apps environment | `mc-env-uae` | UAE North |
| MySQL Flexible Server | `mc-mysql-t2fdli` | UAE North |
| Container registry | `mcacrt2fdli` | Central India |

Compute and database are in UAE North because a subscription policy restricts
deployments to five regions, and Central India's MySQL provider is unavailable
to this subscription.

## Redeploying after code changes

Building images in the cloud is not possible here: this subscription blocks ACR
Tasks. Images must be built locally with Docker Desktop running, then pushed.

    az acr login --name mcacrt2fdli

    # After changing PHP/Laravel code:
    docker build -f docker/api/Dockerfile.prod -t mcacrt2fdli.azurecr.io/mosqueconnect-api:v3 .
    docker push mcacrt2fdli.azurecr.io/mosqueconnect-api:v3
    az containerapp update --name mc-api --resource-group mosqueconnect-rg \
      --image mcacrt2fdli.azurecr.io/mosqueconnect-api:v3

    # After changing React code or any VITE_ value:
    docker build -f docker/web/Dockerfile.prod \
      --build-arg VITE_API_URL=https://mc-api.politedune-07ecd987.uaenorth.azurecontainerapps.io \
      -t mcacrt2fdli.azurecr.io/mosqueconnect-web:v2 .
    docker push mcacrt2fdli.azurecr.io/mosqueconnect-web:v2
    az containerapp update --name mc-web --resource-group mosqueconnect-rg \
      --image mcacrt2fdli.azurecr.io/mosqueconnect-web:v2

Use a new tag each time rather than reusing one, so a rollout always pulls the
new image.

Settings read at runtime, such as database credentials or logging, need no
rebuild:

    az containerapp update --name mc-api --resource-group mosqueconnect-rg \
      --set-env-vars "SOME_SETTING=value"

New database migrations run by setting `RUN_MIGRATIONS=true` for one boot, then
returning it to `false`.

## Known limitations

The site currently runs with `APP_ENV=local` so that OTP codes are written to
the logs. Anyone able to read those logs can sign in as any phone number, so the
address should not be shared publicly. Restore the safer behaviour with:

    az containerapp update --name mc-api --resource-group mosqueconnect-rg \
      --set-env-vars "APP_ENV=production"

Google Maps is not configured in the deployed frontend. The key in
`apps/web/.env` is not part of the built image, because Vite inlines `VITE_`
values at build time; deploying it requires a web image rebuild passing the key
as a `--build-arg`. Restrict such a key by HTTP referrer first, since it is
visible in the public JavaScript bundle.

Running costs are roughly $68/month against the $100 student credit, mostly
because both container apps are always on. Setting their minimum replica count
to zero reduces this substantially, at the cost of a short delay on the first
request after an idle period.
