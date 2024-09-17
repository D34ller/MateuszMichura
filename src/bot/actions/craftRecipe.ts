import { log } from '../utils/log'
import { goals } from 'mineflayer-pathfinder'
import { Vec3 } from 'vec3'
import { collectBlock } from './collectBlock'
import { type Bot } from 'mineflayer'
import { type Block } from 'prismarine-block'
import { Item } from 'prismarine-item'

const { GoalNear } = goals

export const craftRecipe = async (bot: Bot, itemName: string, num = 1) => {
  let placedTable = false

  if (itemName.endsWith('plank')) itemName += 's'

  // get recipes that don't require a crafting table
  let recipes = bot.recipesFor(
    bot.registry.itemsByName[itemName].id,
    null,
    1,
    null
  )
  let craftingTable: Block | null = null
  const craftingTableRange = 32

  if (!recipes || recipes.length === 0) {
    //get recipes that require a crafting table
    craftingTable = bot.findBlock({
      matching: block => block.name === 'crafting_table',
      maxDistance: craftingTableRange,
    })

    if (craftingTable === null) {
      // Try to place crafting table
      let hasTable = bot.inventory
        .items()
        .some(item => item.name === 'crafting_table')

      if (hasTable) {
        let pos = bot.entity.position.offset(1, 0, 0)

        await bot.placeBlock(bot.blockAt(pos) as Block, new Vec3(0, 1, 0))
        craftingTable = bot.findBlock({
          matching: block => block.name === 'crafting_table',
          maxDistance: craftingTableRange,
        })
        if (craftingTable) {
          recipes = bot.recipesFor(
            bot.registry.itemsByName[itemName].id,
            null,
            1,
            craftingTable
          )
          placedTable = true

          if (!recipes || recipes.length === 0) {
            //print what bot is missing
            const allRecipies = bot.recipesAll(
              bot.registry.itemsByName[itemName].id,
              null,
              true
            )

            console.log('1')

            let missingItems = ''
            allRecipies[0].ingredients.forEach(ingredient => {
              let count = bot.inventory.count(ingredient.id, null)
              if (count < ingredient.count) {
                missingItems += `${ingredient.count - count} ${
                  new Item(ingredient.id, 1).name
                }, `
              }
            })

            return log(
              bot,
              `You do not have enough resources to craft ${itemName}. Missing: ${missingItems}`,
              true
            )
          }
        }
      } else {
        return log(
          bot,
          `It requires a crafting table to craft ${itemName}`,
          true
        )
      }
    } else {
      recipes = bot.recipesFor(
        bot.registry.itemsByName[itemName].id,
        null,
        1,
        craftingTable
      )
    }
  }

  if (!recipes || recipes.length === 0) {
    if (placedTable) {
      await collectBlock(bot, 'crafting_table', 1)
    }

    //print what bot is missing
    const allRecipies = bot.recipesAll(
      bot.registry.itemsByName[itemName].id,
      null,
      null
    )

    console.log('2')

    let missingItems = ''
    allRecipies[0].ingredients.forEach(ingredient => {
      let count = bot.inventory.count(ingredient.id, null)
      if (count < ingredient.count) {
        missingItems += `${ingredient.count - count} ${
          new Item(ingredient.id, 1).name
        }, `
      }
    })

    return log(
      bot,
      `You do not have enough resources to craft ${itemName}. Missing: ${missingItems}`,
      true
    )
  }

  if (
    craftingTable &&
    bot.entity.position.distanceTo(craftingTable.position) > 4
  ) {
    await bot.pathfinder.goto(
      new GoalNear(
        craftingTable.position.x,
        craftingTable.position.y,
        craftingTable.position.z,
        1
      )
    )
  }
  const recipe = recipes[0]
  console.log('crafting...')
  await bot.craft(recipe, num, craftingTable as Block)

  if (placedTable) {
    await collectBlock(bot, 'crafting_table', 1)
  }

  let craftedItemCount = 0

  bot.inventory.items().forEach(item => {
    if (item.name === itemName) {
      craftedItemCount += item.count
    }
  })

  const craftedItemMessage = `Successfully crafted ${itemName}, you now have ${craftedItemCount} ${itemName}.`
  return log(bot, craftedItemMessage, true)
}
