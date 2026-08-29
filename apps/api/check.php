<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$mosques = \App\Models\Mosque::all();
echo "Count: " . $mosques->count() . "\n";
foreach($mosques as $m) {
    echo $m->id . " - " . $m->name . "\n";
}
