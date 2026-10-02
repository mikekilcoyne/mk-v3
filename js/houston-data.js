/* Lee + Mike's Houston Adventures — the data behind /houston.

   Everything on the page comes from here. To add a spot, copy any line in
   SPOTS and change it. Fields:
     id     unique, lowercase, no spaces (it's what remembers a stamp)
     tab    'eat' | 'go' | 'do'
     name   full name, shown in the detail sheet
     stamp  short name printed on the stamp (keep it under ~14 characters)
     hood   neighborhood
     why    one line — why it's worth it
     icon   flame | taco | fork | glass | beer | coffee | art | chapel | tree
            | bat | rocket | wave | star
     shape  rect | arch | circle | hex | diamond
     ink    orange | teal | navy | green | maroon | purple | red
     q      what to search in Maps (defaults to name + ", Houston TX")
     from   'lee' for Lee's recs; anything else is Mike's

   Plan times are Houston time unless they say otherwise (e.g. "ET"). `idea: true` marks a suggestion rather than
   something decided; `spot` opens that stamp; `room: true` opens the
   guest-room checklist. */

window.HOUSTON = {
    /* Who a rec came from. A spot without `from` is Mike's. Photos are
       square crops in photos_web/houston/; until a file is there, the
       initial shows on the person's color. */
    people: {
        mike: { name: 'Mike', photo: '/photos_web/houston/mike.jpg', color: '#FFDD22' },
        lee:  { name: 'Lee',  photo: '/photos_web/houston/lee.jpg',  color: '#FF1D9C' }
    },
    defaultFrom: 'mike',

    trip: {
        start: '2026-10-02',
        end:   '2026-10-16'   // no return flight on file yet — runs through the spelling bee
    },

    plans: [
        { date: '2026-10-02', time: '3:10 PM ET', title: 'Mike takes off from Long Island', note: 'ISP → Baltimore (6:25 PM ET) → Houston', kind: 'flight' },
        { date: '2026-10-02', time: '8:40 PM', title: 'Mike lands at Hobby', note: 'Houston time · Southwest via BWI', kind: 'flight' },

        { date: '2026-10-03', time: 'Morning', title: 'Coffee at Blacksmith', spot: 'blacksmith', idea: true },
        { date: '2026-10-03', time: '12:30 PM', title: 'Houston Stories screening at MFAH', spot: 'houston-stories', idea: true, note: 'Local filmmakers, in person — a break from the room?' },
        { date: '2026-10-03', time: 'All day', title: 'Guest bedroom glow-up', note: 'Make it AWESOME — open the checklist', room: true },
        { date: '2026-10-03', time: 'Dusk',    title: 'Bats at Waugh Drive Bridge', spot: 'bats', idea: true },

        { date: '2026-10-04', time: 'Brunch',  title: 'The Breakfast Klub', spot: 'breakfast-klub', idea: true },
        { date: '2026-10-04', time: 'Afternoon', title: 'Space Center Houston', spot: 'space-center', idea: true, note: 'Ten minutes from Rosewater' },
        { date: '2026-10-04', time: 'Game day', title: 'Dash vs. Spirit — Pups at the Pitch', spot: 'dash', idea: true, note: 'Trinity Rodman in town; check kickoff' },
        { date: '2026-10-04', time: 'Evening', title: 'Rosewater, Clear Lake', spot: 'rosewater' },

        { date: '2026-10-05', time: 'Lunch',   title: 'Truth BBQ', spot: 'truth-bbq', idea: true },
        { date: '2026-10-05', time: 'All week', title: 'F1 events around town', note: 'From the post — kicks off 10/5', idea: true, from: 'lee' },
        { date: '2026-10-05', time: 'Any night', title: 'Sim racing at Velocity', spot: 'velocity', idea: true },
        { date: '2026-10-05', time: 'Dusk',    title: 'Ride the bayou', spot: 'bayou-bikes', idea: true },

        { date: '2026-10-16', time: 'Night',   title: 'Drunk Spelling Bee at Boozers', spot: 'spelling-bee' }
    ],

    /* The guest-room checklist. Add or remove lines freely; ticks are
       remembered per phone, keyed on the item's text. */
    room: {
        title: 'Guest Room Glow‑Up',
        date: '2026-10-03',
        sections: [
            { name: 'Clear the decks', items: [
                'Empty it out — donate / toss pile',
                'Deep clean: baseboards, vents, windows',
                'Patch holes + touch-up paint',
                'Measure walls, window and bed (write it down)'
            ] },
            { name: 'The bed', items: [
                'Mattress protector or topper',
                'Crisp sheets',
                'Duvet + a cover you love',
                'Four pillows — two firm, two soft',
                'Throw blanket at the foot'
            ] },
            { name: 'Light + mood', items: [
                'Bedside lamp with a warm bulb',
                'Blackout curtains',
                'Dimmer or smart bulb',
                'Candle or diffuser'
            ] },
            { name: 'Hotel-grade details', items: [
                'Nightstand with a drawer',
                'Luggage rack or bench',
                'Hooks + a few good hangers',
                'Full-length mirror',
                'Charging station by the bed',
                'Wi-Fi password, framed',
                'A rug underfoot'
            ] },
            { name: 'The welcome basket', items: [
                'Towels — bath, hand, wash',
                'Toothbrush + travel toiletries',
                'Water carafe + glass',
                'Snacks',
                'Earplugs + eye mask',
                'A handwritten note'
            ] },
            { name: 'Finishing touches', items: [
                'Art on the walls',
                'A plant (pothos — unkillable)',
                'A couple of books on the nightstand'
            ] }
        ]
    },

    tabs: {
        eat: { title: 'Eat + Drink', blurb: 'Restaurant recs' },
        go:  { title: 'Places to Hit', blurb: 'See it once' },
        do:  { title: 'Adventures', blurb: 'Go do a thing' }
    },

    spots: [
        // ── Eat + Drink ──────────────────────────────────────────────
        { id: 'truth-bbq', tab: 'eat', name: 'Truth BBQ', stamp: 'TRUTH BBQ', hood: 'Washington Ave', why: 'Brisket worth the line. Get there before it sells out.', icon: 'flame', shape: 'rect', ink: 'maroon' },
        { id: 'xochi', tab: 'eat', name: 'Xochi', stamp: 'XOCHI', hood: 'Downtown', why: 'Hugo Ortega’s Oaxacan kitchen — mole, masa, mezcal.', icon: 'taco', shape: 'arch', ink: 'orange' },
        { id: 'breakfast-klub', tab: 'eat', name: 'The Breakfast Klub', stamp: 'BREAKFAST KLUB', hood: 'Midtown', why: 'Wings & waffles. The line moves; it’s worth it.', icon: 'fork', shape: 'circle', ink: 'navy' },
        { id: 'ninfas', tab: 'eat', name: 'The Original Ninfa’s on Navigation', stamp: 'NINFA’S', hood: 'East End', why: 'Where Houston’s fajita obsession started.', icon: 'taco', shape: 'hex', ink: 'green', q: 'The Original Ninfa\'s on Navigation, Houston TX' },
        { id: 'uchi', tab: 'eat', name: 'Uchi', stamp: 'UCHI', hood: 'Montrose', why: 'Sushi. Sit at the bar and say yes to the specials.', icon: 'fork', shape: 'rect', ink: 'purple' },
        { id: 'tacos-tierra', tab: 'eat', name: 'Tacos Tierra Caliente', stamp: 'TIERRA CALIENTE', hood: 'Montrose', why: 'Truck tacos — al pastor — then cross the street to the Ice House.', icon: 'taco', shape: 'diamond', ink: 'orange' },
        { id: 'nancys', tab: 'eat', name: 'Nancy’s Hustle', stamp: 'NANCY’S HUSTLE', hood: 'EaDo', why: 'Natural wine and the famous Nancy cakes. Book ahead.', icon: 'glass', shape: 'arch', ink: 'teal' },
        { id: 'mala', tab: 'eat', name: 'Mala Sichuan Bistro', stamp: 'MALA', hood: 'Chinatown', why: 'Real Sichuan heat out on Bellaire.', icon: 'flame', shape: 'circle', ink: 'red' },
        { id: 'blacksmith', tab: 'eat', name: 'Blacksmith', stamp: 'BLACKSMITH', hood: 'Montrose', why: 'Morning coffee, done right.', icon: 'coffee', shape: 'rect', ink: 'navy' },
        { id: 'anvil', tab: 'eat', name: 'Anvil Bar & Refuge', stamp: 'ANVIL', hood: 'Montrose', why: 'The cocktail bar that put Houston drinking on the map.', icon: 'glass', shape: 'hex', ink: 'maroon' },
        { id: 'ice-house', tab: 'eat', name: 'West Alabama Ice House', stamp: 'ICE HOUSE', hood: 'Montrose', why: 'Picnic tables, cold beer, dogs, zero pretense.', icon: 'beer', shape: 'rect', ink: 'green' },
        { id: 'rosewater', tab: 'eat', from: 'lee', name: 'Rosewater', stamp: 'ROSEWATER', hood: 'Clear Lake', why: 'Neighborhood bar — reworked classic cocktails, rare spirits, good burgers. Pair it with Space Center.', icon: 'glass', shape: 'arch', ink: 'red', q: 'Rosewater Clear Lake, Houston TX' },

        // ── Places to Hit ────────────────────────────────────────────
        { id: 'rothko', tab: 'go', name: 'Rothko Chapel', stamp: 'ROTHKO CHAPEL', hood: 'Montrose', why: 'Fourteen Rothkos, one quiet room. Free.', icon: 'chapel', shape: 'rect', ink: 'navy' },
        { id: 'menil', tab: 'go', name: 'The Menil Collection', stamp: 'THE MENIL', hood: 'Montrose', why: 'World-class art, free, on a lawn under live oaks. Don’t skip the Twombly Gallery.', icon: 'art', shape: 'arch', ink: 'green' },
        { id: 'skyspace', tab: 'go', name: 'Twilight Epiphany — Turrell Skyspace', stamp: 'SKYSPACE', hood: 'Rice University', why: 'James Turrell’s light sequence at sunset. Free — reserve a slot.', icon: 'star', shape: 'circle', ink: 'purple', q: 'James Turrell Twilight Epiphany Skyspace, Rice University' },
        { id: 'cistern', tab: 'go', name: 'Buffalo Bayou Park Cistern', stamp: 'THE CISTERN', hood: 'Buffalo Bayou', why: 'A 1926 underground reservoir turned echo chamber. Book the tour.', icon: 'wave', shape: 'hex', ink: 'teal' },
        { id: 'mfah', tab: 'go', name: 'Museum of Fine Arts, Houston', stamp: 'MFAH', hood: 'Museum District', why: 'Walk the Turrell light tunnel between the buildings.', icon: 'art', shape: 'rect', ink: 'orange' },
        { id: 'beer-can', tab: 'go', name: 'Beer Can House', stamp: 'BEER CAN HOUSE', hood: 'Rice Military', why: 'A house clad in 50,000 flattened cans. Peak Houston.', icon: 'beer', shape: 'diamond', ink: 'red' },
        { id: 'orange-show', tab: 'go', name: 'The Orange Show + Smither Park', stamp: 'ORANGE SHOW', hood: 'East End', why: 'A folk-art fever dream, with a mosaic park next door.', icon: 'star', shape: 'circle', ink: 'orange', q: 'The Orange Show, Houston TX' },
        { id: 'hermann', tab: 'go', name: 'Hermann Park', stamp: 'HERMANN PARK', hood: 'Museum District', why: 'Japanese Garden, paddle boats, McGovern Centennial Gardens.', icon: 'tree', shape: 'arch', ink: 'green' },

        // ── Adventures ───────────────────────────────────────────────
        { id: 'bats', tab: 'do', name: 'Bat watch at Waugh Drive Bridge', stamp: 'BAT BRIDGE', hood: 'Buffalo Bayou', why: 'A quarter-million bats pour out at dusk. Stand on the viewing deck.', icon: 'bat', shape: 'arch', ink: 'navy', q: 'Waugh Drive Bat Colony, Houston TX' },
        { id: 'bayou-bikes', tab: 'do', name: 'Bike Buffalo Bayou', stamp: 'BAYOU RIDE', hood: 'Downtown → Shepherd', why: 'Grab a BCycle and ride the bayou trails at golden hour.', icon: 'tree', shape: 'rect', ink: 'teal', q: 'Buffalo Bayou Park, Houston TX' },
        { id: 'space-center', tab: 'do', name: 'Space Center Houston', stamp: 'SPACE CENTER', hood: 'Clear Lake', why: 'Mission Control, a Saturn V, the tram tour.', icon: 'rocket', shape: 'hex', ink: 'purple' },
        { id: 'galveston', tab: 'do', name: 'Galveston day trip', stamp: 'GALVESTON', hood: '~1 hr south', why: 'The Seawall, the Strand, Gulf seafood at Gaido’s.', icon: 'wave', shape: 'circle', ink: 'teal', q: 'Galveston Seawall, Galveston TX' },
        { id: 'saint-arnold', tab: 'do', name: 'Saint Arnold Brewing', stamp: 'SAINT ARNOLD', hood: 'Near Northside', why: 'Texas’ oldest craft brewery. Big beer hall, beer garden.', icon: 'beer', shape: 'rect', ink: 'orange' },
        { id: 'houston-stories', tab: 'do', from: 'lee', name: 'Houston Stories — local filmmakers at MFAH', stamp: 'HOUSTON STORIES', hood: 'MFAH · Sat Oct 3', why: 'Docs, shorts and experimental work by Houston filmmakers, shot in Houston, filmmakers in the room. Houston Cinema Arts Festival, 12:30 PM.', icon: 'star', shape: 'rect', ink: 'orange', q: 'Museum of Fine Arts, Houston' },
        { id: 'blue-bell', tab: 'do', from: 'lee', name: 'Blue Bell Creameries, Brenham', stamp: 'BLUE BELL', hood: 'Brenham · ~1h15 NW', why: 'The birthplace of Blue Bell. Watch it get made, then eat flavors you can’t find anywhere else. Check hours before driving.', icon: 'tree', shape: 'arch', ink: 'navy', q: 'Blue Bell Creameries Visitors Center, Brenham TX' },
        { id: 'velocity', tab: 'do', from: 'lee', name: 'Velocity Sim Racing Lounge', stamp: 'VELOCITY', hood: 'Channelview', why: 'Full racing simulators — and, per the TikTok, something hidden inside. Perfect for F1 week.', icon: 'rocket', shape: 'diamond', ink: 'red', q: 'Velocity Sim Racing Lounge, Channelview TX' },
        { id: 'dash', tab: 'do', from: 'lee', name: 'Houston Dash vs. Washington Spirit', stamp: 'HOUSTON DASH', hood: 'Shell Energy Stadium · Oct 4', why: 'Pups at the Pitch night — thousands of fans and their dogs. Trinity Rodman and the Spirit in town.', icon: 'star', shape: 'circle', ink: 'orange', q: 'Shell Energy Stadium, Houston TX' },
        { id: 'spelling-bee', tab: 'do', from: 'lee', name: 'Drunk Spelling Bee at Boozers', stamp: 'SPELLING BEE', hood: 'Boozers · Oct 16', why: 'Spell it right, drink anyway. On the calendar for Friday, Oct 16.', icon: 'glass', shape: 'hex', ink: 'maroon', q: 'Boozers, Houston TX' },
        { id: 'tunnels', tab: 'do', name: 'The Downtown Tunnels', stamp: 'THE TUNNELS', hood: 'Downtown', why: 'Six miles of tunnels under downtown. Weekdays, around lunch.', icon: 'star', shape: 'diamond', ink: 'red', q: 'Houston Downtown Tunnel System' }
    ]
};
