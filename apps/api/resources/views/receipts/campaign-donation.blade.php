<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Donation receipt {{ $receiptNumber }}</title>
    <style>
        body { color: #202923; font-family: DejaVu Sans, sans-serif; font-size: 12px; line-height: 1.5; }
        h1 { color: #14583f; font-size: 22px; margin-bottom: 4px; }
        .muted { color: #68736c; }
        .rule { border-top: 1px solid #d8dfda; margin: 18px 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border-bottom: 1px solid #e3e8e4; padding: 9px 4px; text-align: left; vertical-align: top; }
        th { color: #68736c; font-weight: normal; width: 34%; }
    </style>
</head>
<body>
    <h1>Donation receipt</h1>
    <div class="muted">MosqueConnect · {{ $receiptNumber }}</div>
    <div class="rule"></div>

    <table>
        <tr><th>Donor</th><td>{{ $donorName }}</td></tr>
        <tr><th>Amount</th><td>{{ $donation->campaign->currency }} {{ number_format((float) $donation->amount, 2) }}</td></tr>
        <tr><th>Payment method</th><td>{{ str($donation->payment_method)->replace('_', ' ')->title() }}</td></tr>
        <tr><th>Reference</th><td>{{ $donation->reference ?: 'Not provided' }}</td></tr>
        <tr><th>Campaign</th><td>{{ $donation->campaign->title }}</td></tr>
        <tr><th>Mosque</th><td>{{ $donation->campaign->mosque->name }}</td></tr>
        <tr><th>Confirmed by</th><td>{{ $donation->confirmer?->name ?: 'Mosque administrator' }}</td></tr>
        <tr><th>Confirmed at</th><td>{{ $donation->confirmed_at?->toDateTimeString() ?: 'Not available' }}</td></tr>
    </table>

    <p class="muted">This receipt confirms a manually verified donation recorded by the mosque.</p>
</body>
</html>