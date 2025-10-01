local QBCore = exports['qb-core']:GetCoreObject()
local isBoss = false
local playerJob = {}
local policeListEnabled = false
local callsign = ""

-- ======================
-- Utility: Check Boss
-- ======================
local function CheckIfBoss()
    local playerData = QBCore.Functions.GetPlayerData()
    if playerData and playerData.job then
        isBoss = playerData.job.isboss or false
        playerJob = playerData.job
    else
        isBoss = false
        playerJob = {}
    end
end

-- ======================
-- Open / Close Menu
-- ======================
local menuOpen = false

RegisterNetEvent('plist:openMenu', function(data)
    CheckIfBoss() -- refresh boss status
    menuOpen = true
    SetNuiFocus(true, true)

    -- Send open message to NUI including locale
    SendNUIMessage({
        action = 'open',
        isBoss = data.isBoss,
        callsign = data.callsign or callsign,
        opacity = data.opacity or 100,
        size = data.size or 1,
        policeListEnabled = data.policeListEnabled or policeListEnabled,
        locale = locale -- pass translations
    })
end)

RegisterNetEvent('plist:updatePlayerList', function(players)
    SendNUIMessage({
        action = "updatePlayerList",
        players = players
    })
end)

local function ClosePoliceMenu()
    menuOpen = false
    SetNuiFocus(false, false)
    SendNUIMessage({ action = "close" })
end

-- ======================
-- Commands / Keybinding
-- ======================
RegisterCommand("policemenu", function()
    if menuOpen then
        ClosePoliceMenu()
    else
        TriggerServerEvent('plist:requestMenu')
    end
end, false)

RegisterKeyMapping("policemenu", "Open Police Menu", "keyboard", "EQUALS")

-- ======================
-- Receive Grade Colors from Server
-- ======================
RegisterNetEvent("plist:updateGrades", function(grades)
    SendNUIMessage({
        action = "updateGrades",
        grades = grades
    })
end)

-- ======================
-- Receive Player Data from Server
-- ======================
RegisterNetEvent("plist:sendData", function(data)
    callsign = data.callsign or ""
    policeListEnabled = data.policeListEnabled or false
    playerJob = data.job or {}
    CheckIfBoss()
end)

-- ======================
-- Handle NUI Callbacks
-- ======================
RegisterNUICallback("closeMenu", function(_, cb)
    ClosePoliceMenu()
    cb("ok")
end)

RegisterNUICallback("saveCallsign", function(data, cb)
    callsign = data.callsign or ""
    TriggerServerEvent("plist:saveCallsign", callsign)
    cb("ok")
end)

RegisterNUICallback("updateSettings", function(data, cb)
    policeListEnabled = data.policeListEnabled or false
    TriggerServerEvent("plist:updateSettings", policeListEnabled)
    cb("ok")
end)

RegisterNUICallback('addGrade', function(data, cb)
    TriggerServerEvent('plist:addGrade', data)
    cb({ success = true })
end)

RegisterNUICallback('requestGradeColors', function(_, cb)
    TriggerServerEvent('plist:requestGradeColors')
    cb({})
end)

RegisterNUICallback("deleteGrade", function(data, cb)
    if data.min and data.max then
        print("[PoliceMenu] Deleting grade:", data.min, data.max) -- debug
        TriggerServerEvent("plist:deleteGrade", data)
    end
    cb("ok")
end)
