<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; color: #18332b; margin: 36px; }
        .certificate { border: 6px double #2f6f55; padding: 48px; text-align: center; }
        h1 { font-size: 32px; margin: 0 0 24px; }
        .name { font-size: 28px; font-weight: bold; margin: 24px 0; }
        .details { font-size: 16px; line-height: 1.8; }
        .verification { margin-top: 30px; font-size: 12px; color: #52645d; }
    </style>
</head>
<body>
    <main class="certificate">
        <h1>Certificate of Volunteer Service</h1>
        <p>This certificate is awarded to</p>
        <p class="name">{{ $application->user->name }}</p>
        <p class="details">
            In recognition of service at <strong>{{ $application->opportunity->title }}</strong><br>
            Organized by {{ $application->opportunity->mosque->name }}<br>
            {{ $application->opportunity->opportunity_date->format('F j, Y') }}<br>
            {{ number_format((float) $application->hours, 1) }} volunteer hours
        </p>
        <p class="verification">Verification code: {{ $application->certificate_code }}</p>
    </main>
</body>
</html>
