local QBCore = exports['qb-core']:GetCoreObject()

-- ========================
-- Utility: Get Active Police Players
-- ========================

-- Creates a row for a police player if it doesn't exist
local function EnsurePlayerSettings(citizenid)
    local result = MySQL.query.await('SELECT id FROM police_settings WHERE citizenid = ?', { citizenid })
    if not result[1] then
        -- Insert a default row with empty callsign
        MySQL.query.await('INSERT INTO police_settings (citizenid, callsign) VALUES (?, ?)', { citizenid, "" })
    end
end

local function GetActivePolicePlayers()
    local players = {}
    for _, playerId in ipairs(QBCore.Functions.GetPlayers()) do
        local Player = QBCore.Functions.GetPlayer(playerId)
        if Player and Player.PlayerData.job.name == "police" then
            -- Make sure callsign exists
            local callsign = MySQL.scalar.await('SELECT callsign FROM police_settings WHERE citizenid = ?', { Player.PlayerData.citizenid }) or ""

            table.insert(players, {
                firstname = Player.PlayerData.charinfo.firstname,
                lastname = Player.PlayerData.charinfo.lastname,
                grade = Player.PlayerData.job.grade.name,   -- rank name
                gradeNum = Player.PlayerData.job.grade.level,
                gradeName = Player.PlayerData.job.grade.label or "Unknown", -- category
                callsign = callsign,
                tag = Player.PlayerData.job.grade.level
            })
        end
    end
    return players
end

-- ========================
-- Save Callsign
-- ========================
RegisterNetEvent('plist:saveCallsign', function(callsign)
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    EnsurePlayerSettings(Player.PlayerData.citizenid)
    MySQL.query.await('UPDATE police_settings SET callsign = ? WHERE citizenid = ?', { callsign, Player.PlayerData.citizenid })

    -- Refresh list for everyone
    local players = GetActivePolicePlayers()
    TriggerClientEvent('plist:updatePlayerList', -1, players)
end)

local function EnsurePlayerSettings(citizenid)
    local result = MySQL.query.await('SELECT id FROM police_settings WHERE citizenid = ?', { citizenid })
    if not result[1] then
        -- Insert default row with empty callsign
        MySQL.query.await('INSERT INTO police_settings (citizenid, callsign) VALUES (?, ?)', { citizenid, "" })
    end
end


local function GetPlayerCallsign(citizenid)
    local result = MySQL.query.await('SELECT callsign FROM police_settings WHERE citizenid = ?', { citizenid })
    if result[1] and result[1].callsign then
        return result[1].callsign
    end
    return ""
end


-- ========================
-- Menu Open
-- ========================
RegisterNetEvent('plist:requestMenu', function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    if Player.PlayerData.job.name == "police" then
        local isBoss = Player.PlayerData.job.isboss == true

        -- Ensure player exists in police_settings
        local exists = MySQL.scalar.await(
            'SELECT callsign FROM police_settings WHERE citizenid = ?',
            { Player.PlayerData.citizenid }
        )

        if not exists then
            -- Insert with empty callsign if not present
            MySQL.query.await(
                'INSERT INTO police_settings (citizenid, callsign) VALUES (?, ?)',
                { Player.PlayerData.citizenid, "" }
            )
        end

        -- Fetch callsign (can be empty)
        local callsign = MySQL.scalar.await(
            'SELECT callsign FROM police_settings WHERE citizenid = ?',
            { Player.PlayerData.citizenid }
        )

        TriggerClientEvent('plist:openMenu', src, {
            isBoss = isBoss,
            callsign = callsign or "",
            opacity = 100,
            size = 1,
            policeListEnabled = false
        })

        -- Update the player list for everyone
        local players = GetActivePolicePlayers()
        TriggerClientEvent('plist:updatePlayerList', -1, players)
    end
end)

-- ========================
-- Grades Management
-- ========================
RegisterNetEvent('plist:addGrade', function(data)
    local src = source
    local min, max, name, color = data.min, data.max, data.name, data.color
    if not (min and max and color) then return end

    MySQL.query.await([[
        INSERT INTO police_grade_colors (grade_min, grade_max, grade_name, color)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
            grade_name = VALUES(grade_name),
            color      = VALUES(color)
    ]], { min, max, name or "Grade", color })

    local grades = MySQL.query.await('SELECT * FROM police_grade_colors', {})
    TriggerClientEvent('plist:updateGrades', src, grades)
end)

RegisterNetEvent('plist:deleteGrade', function(data)
    local src = source
    local min, max = data.min, data.max
    if not (min and max) then return end

    MySQL.query.await('DELETE FROM police_grade_colors WHERE grade_min = ? AND grade_max = ?', { min, max })

    local grades = MySQL.query.await('SELECT * FROM police_grade_colors', {})
    TriggerClientEvent('plist:updateGrades', src, grades)
end)

RegisterNetEvent("plist:requestData", function()
    local src = source
    local players = {}

    for _, v in pairs(QBCore.Functions.GetQBPlayers()) do
        if v.PlayerData.job.name == "police" then
            table.insert(players, {
                name = v.PlayerData.charinfo.firstname .. " " .. v.PlayerData.charinfo.lastname,
                grade = v.PlayerData.job.grade.name,
                tag = v.PlayerData.metadata["callsign"] or "N/A"
            })
        end
    end

    TriggerClientEvent("plist:updatePlayerList", src, players)
end)

RegisterNetEvent('plist:requestGradeColors', function()
    local src = source
    local grades = MySQL.query.await('SELECT * FROM police_grade_colors', {})

    -- send the table directly; QBCore will handle serialization
    TriggerClientEvent('plist:updateGrades', src, grades)
end)

--When a player changes job
RegisterNetEvent('QBCore:Server:OnJobUpdate', function(newJob)
    local src = source
    local Player = QBCore.Functions.GetPlayer(source)
	

    -- Always refresh the boss menu list for *all* bosses
    local policeList = GetActivePolicePlayers()

    for _, playerId in ipairs(QBCore.Functions.GetPlayers()) do
        local target = QBCore.Functions.GetPlayer(playerId)
        if target and target.PlayerData.job and target.PlayerData.job.name == "police" then
            TriggerClientEvent("plist:sendPlayerList", target.PlayerData.source, policeList)
        end
    end
end)

-- ========================
-- Player List Management
-- ========================
RegisterNetEvent("plist:requestPlayerList", function()
    local src = source
    local Player = QBCore.Functions.GetPlayer(src)
    if not Player then return end

    -- collect all police players
    local players = {}
    for _, v in pairs(QBCore.Functions.GetQBPlayers()) do
        if v.PlayerData.job and v.PlayerData.job.name == "police" then
            players[#players+1] = {
                name = v.PlayerData.charinfo.firstname .. " " .. v.PlayerData.charinfo.lastname,
                grade = v.PlayerData.job.grade.name,
                tag = v.PlayerData.metadata["callsign"] or v.PlayerData.source
            }
        end
    end

    TriggerClientEvent("plist:updatePlayerList", src, players)
end)

-- Auto-broadcast when someone joins
AddEventHandler('QBCore:Server:OnPlayerLoaded', function(playerId)
    local players = GetActivePolicePlayers()
    TriggerClientEvent('plist:updatePlayerList', -1, players)
end)

-- Auto-broadcast on job change
RegisterNetEvent('QBCore:Player:SetJob', function(playerId, job, lastJob)
    local players = GetActivePolicePlayers()
    TriggerClientEvent('plist:updatePlayerList', -1, players)
end)
