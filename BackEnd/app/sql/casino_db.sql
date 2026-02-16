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
