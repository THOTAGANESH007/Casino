-- =========================
-- ENUM TYPES
-- =========================

CREATE TYPE user_type AS ENUM ('admin','player','affiliate','casino_owner');
CREATE TYPE doc_type AS ENUM ('aadhar','pan');
CREATE TYPE wallet_type AS ENUM ('cash','bonus','points');
CREATE TYPE bet_types AS ENUM ('single_bet','multiple_bet','full_cover_bet');
CREATE TYPE bet_statuses AS ENUM ('placed','won','lost','cancelled');
CREATE TYPE txn_types AS ENUM ('upi','credit_card','debit_card','cash');
CREATE TYPE txn_directions AS ENUM ('credit','debit');
CREATE TYPE txn_statuses AS ENUM ('pending','success','failed');

-- =========================
-- CURRENCY & TENANT
-- =========================

CREATE TABLE tenants(
tenant_id SERIAL PRIMARY KEY,
tenant_name TEXT NOT NULL,
default_timezone TEXT,
status BOOLEAN DEFAULT true,
default_currency TEXT,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tenant_regions(
region_id SERIAL PRIMARY KEY,
tenant_id INT REFERENCES tenants(tenant_id),
region_name TEXT,
tax_rate NUMERIC(5,2)
);

-- =========================
-- USERS
-- =========================

CREATE TABLE users (
user_id SERIAL PRIMARY KEY,	
first_name text not null,
last_name text,
is_active boolean default false,
tenant_id INT REFERENCES tenants(tenant_id),
region_id INT REFERENCES tenant_regions(region_id),
email TEXT UNIQUE NOT NULL,
phone TEXT,
password TEXT NOT NULL,
role user_type NOT NULL DEFAULT 'player',
created_by INT REFERENCES users(user_id),
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
forgot_password_otp TEXT
);

select * from users;
select * from tenant_regions;

-- UPDATE users
-- SET role = 'casino_owner'
-- WHERE user_id = 1;

-- created_by = self trigger
CREATE OR REPLACE FUNCTION set_created_by_self()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.created_by IS NULL THEN
        NEW.created_by := NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- We change this to BEFORE INSERT
CREATE TRIGGER user_created_by_self_default
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_created_by_self();

-- =========================
-- KYC
-- =========================

CREATE TABLE user_kyc(
kyc_id SERIAL PRIMARY KEY,
user_id INT REFERENCES users(user_id),
document_type doc_type NOT NULL,
document_number VARCHAR(16) NOT NULL,
document_url TEXT,
parsed_number TEXT,
verified_status BOOLEAN DEFAULT false,
verified_at TIMESTAMPTZ
);

-- =========================
-- WALLET & TRANSACTIONS
-- =========================

CREATE TABLE wallet(
wallet_id SERIAL PRIMARY KEY,
user_id INT REFERENCES users(user_id),
balance NUMERIC(18,2) DEFAULT 0.00,
type_of_wallet wallet_type NOT NULL DEFAULT 'cash'
);

CREATE TABLE wallet_transactions(
txn_id SERIAL PRIMARY KEY,
wallet_id INT REFERENCES wallet(wallet_id),
txn_type txn_types,
txn_direction txn_directions NOT NULL,
txn_status txn_statuses DEFAULT 'pending',
amount NUMERIC(18,2) NOT NULL,
reference_id VARCHAR(40),
txn_done_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- immutable audit ledger

CREATE TABLE wallet_ledger(
ledger_id SERIAL PRIMARY KEY,
wallet_id INT REFERENCES wallet(wallet_id),
before_balance NUMERIC(18,2),
after_balance NUMERIC(18,2),
reference_type TEXT,
reference_id INT,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- GAME PROVIDERS & GAMES
-- =========================

CREATE TABLE tenant_games (
    id SERIAL PRIMARY KEY,
    tenant_id INT NOT NULL REFERENCES tenants(tenant_id),
    provider_game_id INT NOT NULL REFERENCES provider_games(id),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE game_provider(
provider_id SERIAL PRIMARY KEY,
provider_name TEXT UNIQUE NOT NULL,
api_url TEXT NOT NULL,
is_active BOOLEAN default True,
created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game(
game_id SERIAL PRIMARY KEY,
game_name TEXT NOT NULL,
rtp_percent NUMERIC(5,2),
image_url TEXT
);

CREATE TABLE provider_games (
    id SERIAL PRIMARY KEY,
    provider_id INT NOT NULL REFERENCES game_provider(provider_id),
    game_id INT NOT NULL REFERENCES game(game_id),
    cost_per_play NUMERIC(10, 4) DEFAULT 0
);

-- =========================
-- GAME SESSIONS & ROUNDS
-- =========================
CREATE TABLE game_session(
session_id SERIAL PRIMARY KEY,
user_id INT REFERENCES users(user_id),
game_id INT REFERENCES game(game_id),
provider_session_ref VARCHAR(64),
started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ended_at TIMESTAMPTZ
);

CREATE TABLE game_round(
round_id SERIAL PRIMARY KEY,
session_id INT REFERENCES game_session(session_id),
round_number INT,
provider_round_ref VARCHAR(64)
);

-- =========================
-- BETS
-- =========================

CREATE TABLE bet(
bet_id SERIAL PRIMARY KEY,
round_id INT REFERENCES game_round(round_id),
wallet_id INT REFERENCES wallet(wallet_id),
bet_amount NUMERIC(18,2) NOT NULL,
payout_amount NUMERIC(18,2),
odds NUMERIC(8,4),
bet_type bet_types DEFAULT 'single_bet',
bet_status bet_statuses DEFAULT 'placed',
placed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- JACKPOT
-- =========================

CREATE TABLE jackpots(
jackpot_id SERIAL PRIMARY KEY,
tenant_id INT REFERENCES tenants(tenant_id),
name TEXT,
current_amount numeric(18,2) default 1000,
start_amount numeric(18,2) default 1000,
contribution_percent numeric(5,4) default 0.01,
win_probability numeric(10,9),
is_active boolean default true,
updated_at timestamp default current_timestamp
);

CREATE TABLE jackpot_wins(
jackpot_win_id SERIAL PRIMARY KEY,
jackpot_id INT REFERENCES jackpots(jackpot_id),
user_id INT REFERENCES users(user_id),
amount_won numeric(18,2),
won_at timestamp default current_timestamp
);

CREATE TABLE responsible_limits(
limit_id SERIAL PRIMARY KEY,
user_id INT REFERENCES users(user_id),
daily_loss_limit NUMERIC(18,2),
daily_bet_limit NUMERIC(18,2),
monthly_bet_limit NUMERIC(18,2)
);

CREATE TYPE match_status AS ENUM('upcoming', 'live', 'completed', 'cancelled');
CREATE TYPE player_role AS ENUM('batsman', 'bowler', 'all_rounder', 'wicket_keeper');

CREATE TABLE fantasy_matches(
id SERIAL PRIMARY KEY,
match_code VARCHAR(50) UNIQUE NOT NULL,
team1 VARCHAR(50) NOT NULL,
team2 VARCHAR(50) NOT NULL,
status match_status DEFAULT 'upcoming',
entry_fee NUMERIC(18, 2) NOT NULL,
max_budget NUMERIC(18, 2) DEFAULT 100.00,
prize_pool NUMERIC(18, 2) DEFAULT 0.00,
created_at TIMESTAMPTZ DEFAULT NOW(),
start_time TIMESTAMPTZ,
end_time TIMESTAMPTZ
);

CREATE TABLE fantasy_players(
id SERIAL PRIMARY KEY,
match_id INTEGER NOT NULL REFERENCES fantasy_matches(id) ON DELETE CASCADE,
name VARCHAR(100) NOT NULL,
role player_role NOT NULL,
team_name VARCHAR(50) NOT NULL,
credit_value NUMERIC(5, 2) NOT NULL,
stats JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE fantasy_user_teams(
id SERIAL PRIMARY KEY,
user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
match_id INTEGER NOT NULL REFERENCES fantasy_matches(id) ON DELETE CASCADE,
captain_id INTEGER REFERENCES fantasy_players(id),
vice_captain_id INTEGER REFERENCES fantasy_players(id),
total_points NUMERIC(10, 2) DEFAULT 0.00,
rank INTEGER,
prize_won NUMERIC(18, 2) DEFAULT 0.00
);

CREATE TABLE fantasy_team_players_link(
user_team_id INTEGER NOT NULL REFERENCES fantasy_user_teams(id) ON DELETE CASCADE,
player_id INTEGER NOT NULL REFERENCES fantasy_players(id) ON DELETE CASCADE,
PRIMARY KEY (user_team_id, player_id)
);


CREATE TYPE match_statuses AS ENUM ('UPCOMING','LIVE','COMPLETED','CANCELLED');
CREATE TYPE match_type AS ENUM ('TEST','ODI','T20','T10');
CREATE TYPE player_roles AS ENUM ('BATSMAN','BOWLER','ALL_ROUNDER','WICKET_KEEPER');
CREATE TYPE team_status AS ENUM ('DRAFT','SUBMITTED','LOCKED');

CREATE TABLE matches(
match_id SERIAL PRIMARY KEY,
external_match_id VARCHAR(100) UNIQUE NOT NULL,
match_name VARCHAR(200) NOT NULL,
match_type match_type NOT NULL,
venue VARCHAR(200),
match_date TIMESTAMPTZ NOT NULL,
team_a VARCHAR(100) NOT NULL,
team_b VARCHAR(100) NOT NULL,
status match_statuses NOT NULL DEFAULT 'UPCOMING',
entry_fee NUMERIC(10,2) DEFAULT 10.00,
max_budget NUMERIC(10,1) DEFAULT 100.0,
prize_pool NUMERIC(10,2) DEFAULT 0.00,
is_active BOOLEAN DEFAULT FALSE,
teams_locked BOOLEAN DEFAULT FALSE,
series_name VARCHAR(200),
match_number VARCHAR(50),
current_score JSON,
match_data JSON,
created_at TIMESTAMPTZ DEFAULT NOW(),
updated_at TIMESTAMPTZ
);

CREATE TABLE players(
player_id SERIAL PRIMARY KEY,
match_id INTEGER REFERENCES matches(match_id),
external_player_id VARCHAR(100) NOT NULL,
name VARCHAR(100) NOT NULL,
role player_roles NOT NULL,
team VARCHAR(100) NOT NULL,
credits NUMERIC(4,1) NOT NULL,
image_url VARCHAR(255),
meta_data JSON,
created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE player_performances (
    performance_id SERIAL PRIMARY KEY,
    match_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    runs INTEGER DEFAULT 0,
    balls_faced INTEGER DEFAULT 0,
    fours INTEGER DEFAULT 0,
    sixes INTEGER DEFAULT 0,
    strike_rate NUMERIC(6,2) DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    overs NUMERIC(4,1) DEFAULT 0,
    runs_conceded INTEGER DEFAULT 0,
    maidens INTEGER DEFAULT 0,
    economy NUMERIC(5,2) DEFAULT 0,
    catches INTEGER DEFAULT 0,
    stumpings INTEGER DEFAULT 0,
    run_outs INTEGER DEFAULT 0,
    fantasy_points NUMERIC(8,2) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES players(player_id) ON DELETE CASCADE


CREATE TABLE scoring_rules (
    rule_id SERIAL PRIMARY KEY,
    match_id INTEGER UNIQUE NOT NULL,
    run_points NUMERIC(5,2) DEFAULT 1.0,
    four_points NUMERIC(5,2) DEFAULT 1.0,
    six_points NUMERIC(5,2) DEFAULT 2.0,
    thirty_run_bonus NUMERIC(5,2) DEFAULT 4.0,
    half_century_bonus NUMERIC(5,2) DEFAULT 8.0,
    century_bonus NUMERIC(5,2) DEFAULT 16.0,
    duck_penalty NUMERIC(5,2) DEFAULT -2.0,
    wicket_points NUMERIC(5,2) DEFAULT 25.0,
    maiden_over_points NUMERIC(5,2) DEFAULT 12.0,
    three_wicket_bonus NUMERIC(5,2) DEFAULT 4.0,
    four_wicket_bonus NUMERIC(5,2) DEFAULT 8.0,
    five_wicket_bonus NUMERIC(5,2) DEFAULT 16.0,
    catch_points NUMERIC(5,2) DEFAULT 8.0,
    stumping_points NUMERIC(5,2) DEFAULT 12.0,
    run_out_direct_points NUMERIC(5,2) DEFAULT 12.0,
    run_out_indirect_points NUMERIC(5,2) DEFAULT 6.0,
    economy_below_5_bonus NUMERIC(5,2) DEFAULT 6.0,
    economy_below_6_bonus NUMERIC(5,2) DEFAULT 4.0,
    economy_above_10_penalty NUMERIC(5,2) DEFAULT -4.0,
    strike_rate_above_150_bonus NUMERIC(5,2) DEFAULT 6.0,
    strike_rate_above_130_bonus NUMERIC(5,2) DEFAULT 4.0,
    strike_rate_below_70_penalty NUMERIC(5,2) DEFAULT -4.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    FOREIGN KEY(match_id) REFERENCES matches(match_id) ON DELETE CASCADE
);

CREATE TABLE fantasy_teams (
    team_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    match_id INTEGER NOT NULL,
    team_name VARCHAR(100) NOT NULL,
    status team_status NOT NULL DEFAULT 'DRAFT',
    captain_id INTEGER NOT NULL,
    vice_captain_id INTEGER NOT NULL,
    total_credits NUMERIC(5,1) NOT NULL,
    total_points NUMERIC(10,2) DEFAULT 0,
    rank INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    FOREIGN KEY(match_id) REFERENCES matches(match_id) ON DELETE CASCADE,
    FOREIGN KEY(captain_id) REFERENCES players(player_id),
    FOREIGN KEY(vice_captain_id) REFERENCES players(player_id)
);

CREATE TABLE team_players (
    id SERIAL PRIMARY KEY,
    team_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    is_vice_captain BOOLEAN DEFAULT FALSE,
    points NUMERIC(8,2) DEFAULT 0,
    FOREIGN KEY(team_id) REFERENCES fantasy_teams(team_id) ON DELETE CASCADE,
    FOREIGN KEY(player_id) REFERENCES players(player_id) ON DELETE CASCADE,
    UNIQUE(team_id, player_id)
);


CREATE TABLE analytics_snapshots (
    snapshot_id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(tenant_id),
    region_id INTEGER NOT NULL REFERENCES tenant_regions(region_id),
    snapshot_date DATE NOT NULL,
    total_wagered NUMERIC(18, 2) DEFAULT 0,
    total_payout NUMERIC(18, 2) DEFAULT 0,
    total_ggr NUMERIC(18, 2) DEFAULT 0,
    total_ngr NUMERIC(18, 2) DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tenant_snapshot_date UNIQUE (tenant_id, snapshot_date)
);


CREATE OR REPLACE FUNCTION generate_daily_analytics_snapshot()
RETURNS void AS $$
BEGIN
    INSERT INTO analytics_snapshots (
        tenant_id, 
        region_id, 
        snapshot_date, 
        total_wagered, 
        total_payout, 
        total_ggr, 
        total_ngr, 
        active_users
    )
    SELECT 
        t.tenant_id,
        t.region_id,
        CURRENT_DATE - INTERVAL '1 day' AS snapshot_date,
        COALESCE(SUM(b.bet_amount), 0) AS total_wagered,
        COALESCE(SUM(b.payout_amount), 0) AS total_payout,
        COALESCE(SUM(b.bet_amount) - SUM(b.payout_amount), 0) AS total_ggr,
        -- Calculate NGR by deducting the tenant's regional tax rate from the GGR
        COALESCE((SUM(b.bet_amount) - SUM(b.payout_amount)) * (1 - (tr.tax_rate / 100)), 0) AS total_ngr,
        COUNT(DISTINCT gs.user_id) AS active_users
    FROM tenants t
    JOIN tenant_regions tr ON t.region_id = tr.region_id
    LEFT JOIN users u ON u.tenant_id = t.tenant_id
    LEFT JOIN game_session gs ON gs.user_id = u.user_id AND DATE(gs.started_at) = CURRENT_DATE - INTERVAL '1 day'
    LEFT JOIN game_round gr ON gr.session_id = gs.session_id
    LEFT JOIN bet b ON b.round_id = gr.round_id AND b.bet_status != 'cancelled'
    GROUP BY t.tenant_id, t.region_id
    
    -- If a snapshot for this date already exists, update it instead of crashing
    ON CONFLICT ON CONSTRAINT uq_tenant_snapshot_date 
    DO UPDATE SET 
        total_wagered = EXCLUDED.total_wagered,
        total_payout = EXCLUDED.total_payout,
        total_ggr = EXCLUDED.total_ggr,
        total_ngr = EXCLUDED.total_ngr,
        active_users = EXCLUDED.active_users;
END;
$$ LANGUAGE plpgsql;


-- 1. Enable the pg_cron extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule the job to run every day at 01:00 AM database time
SELECT cron.schedule(
    'daily_analytics_rollup',   -- Job Name
    '0 1 * * *',                -- Cron expression (1:00 AM daily)
    'SELECT generate_daily_analytics_snapshot();' -- Command to execute
);


CREATE OR REPLACE FUNCTION log_cash_wallet_transaction()
RETURNS TRIGGER AS $$
DECLARE
    balance_diff NUMERIC(18,2);
    v_txn_direction txn_directions;
BEGIN
    -- Calculate the difference in balance
    balance_diff := NEW.balance - OLD.balance;

    -- Only proceed if the balance actually changed AND it is a 'cash' wallet
    IF balance_diff <> 0 AND NEW.type_of_wallet = 'cash' THEN
        
        -- Determine direction based on the ENUM you provided ('credit' or 'debit')
        IF balance_diff > 0 THEN
            v_txn_direction := 'credit';
        ELSE
            v_txn_direction := 'debit';
        END IF;

        -- Insert the audit record into wallet_transactions
        INSERT INTO public.wallet_transactions (
            wallet_id,
            txn_type,          -- Using 'cash' because the DB doesn't know the payment method
            txn_direction,     -- 'credit' or 'debit'
            txn_status,        -- Assuming your txn_statuses ENUM has 'completed'
            amount,
            txn_done_at
        ) VALUES (
            NEW.wallet_id,
            'debit_card',            -- Defaulting to 'cash' 
            v_txn_direction,
            'success',       
            ABS(balance_diff), -- Always store amount as a positive number
            CURRENT_TIMESTAMP
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;



CREATE TRIGGER trg_audit_cash_wallet
AFTER UPDATE OF balance ON public.wallet
FOR EACH ROW
WHEN (OLD.balance IS DISTINCT FROM NEW.balance) 
EXECUTE FUNCTION log_cash_wallet_transaction();
