import { GOAL_HISTORY_LIMIT, seasonGoalPoolSize } from './goals'
import {
  SELL_BASE_PRICE,
  SELL_LABEL,
} from './sell'
import { JOB_ROLES, ROLE_LABEL } from './careers'
import {
  BOAT_FISH_CAP,
  BOAT_MAX_LEVEL,
  BOAT_WOOD_CAP,
  catCapForCottage,
  COTTAGE_MAX_LEVEL,
  COTTAGE_UPGRADE_PRICE,
  DAYS_PER_SEASON,
  FARM_SIZE,
  FISH_DAILY_PER_CAT,
  FISH_SOFT_CAP,
  GRANARY_DAILY_DECAY,
  GRANARY_MAX_LEVEL,
  GRANARY_REPAIR_AMOUNT,
  GRANARY_REPAIR_COST,
  HARBOR_MAX_LEVEL,
  MINUTES_PER_DAY,
  ROLE_CONSUME_PER_LEVEL,
  ROLE_MAX_LEVEL,
  ROLE_UPGRADE_KNOWLEDGE,
  ROLE_YIELD_PER_LEVEL,
  SEED_PACK_AMOUNT,
  SEED_PACK_PRICE,
  voyageCooldownMinutes,
  voyageDurationMinutes,
} from '../types'

export type ManualSection = {
  id: string
  title: string
  paragraphs: string[]
}

export function filterManualSections(
  sections: ManualSection[],
  query: string,
): ManualSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return sections
  return sections.filter((s) => {
    if (s.title.toLowerCase().includes(q)) return true
    return s.paragraphs.some((p) => p.toLowerCase().includes(q))
  })
}

/** 返回片段；调用方把 hit 段包成 <mark> */
export function highlightSegments(
  text: string,
  query: string,
): Array<{ text: string; hit: boolean }> {
  const q = query.trim()
  if (!q) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const out: Array<{ text: string; hit: boolean }> = []
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(needle, i)
    if (at < 0) {
      out.push({ text: text.slice(i), hit: false })
      break
    }
    if (at > i) out.push({ text: text.slice(i, at), hit: false })
    out.push({ text: text.slice(at, at + needle.length), hit: true })
    i = at + needle.length
  }
  return out.length ? out : [{ text, hit: false }]
}

const roleList = JOB_ROLES.map((r) => ROLE_LABEL[r]).join('、')
const yieldPct = Math.round(ROLE_YIELD_PER_LEVEL * 100)
const consumePct = Math.round(ROLE_CONSUME_PER_LEVEL * 100)
const voyageHours = (voyageDurationMinutes(1) / 60).toFixed(1)
const cooldownHours = (voyageCooldownMinutes(1) / 60).toFixed(1)

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    title: '开局与目标',
    paragraphs: [
      '喵圃是一座小岛：养猫、种田、采矿伐木、出海贸易。猫会自主干活，头顶偶尔冒出碎碎念；生病时头顶会挂「病」字标。你主要安排职业、扩建建筑、盯紧口粮与药品。',
      `每季约 ${DAYS_PER_SEASON} 天。季节目标种类含：囤鱼/麦/矿/木/金币/知识，小屋/港口/货船等级，猫群数量，以及本季出航、炼药、收获、伐木次数；同种类还有多档数值。四季合计约 ${seasonGoalPoolSize()} 条候选，并避开近 ${GOAL_HISTORY_LIMIT} 季已出现的组合。完成后可得金币、药品或知识。`,
      '若猫全部失散或饿死，会进入全灭；可重新开始。',
    ],
  },
  {
    id: 'time',
    title: '时间与季节',
    paragraphs: [
      `游戏内一天共 ${MINUTES_PER_DAY} 分钟；清晨到夜晚循环，影响猫咪作息与出海窗口。`,
      `一季 ${DAYS_PER_SEASON} 天，四季轮转。天气会下雨或晴朗，偶尔雨后出虹；不影响核心玩法，但氛围会变。`,
      '跨日结算时消耗鱼肉口粮、可能生病/治愈，并推进季节目标进度。',
    ],
  },
  {
    id: 'resources',
    title: '资源',
    paragraphs: [
      '常见资源：金币、麦种、小麦、鱼肉、矿石、木材、知识、药品。左侧商店可购买种子、零食玩具，以及升级建筑。',
      `鱼肉是每日口粮（基础约每猫 ${FISH_DAILY_PER_CAT}，职业等级越高日耗越多）。库存软上限参考：鱼肉 ${FISH_SOFT_CAP}。`,
      `麦种可在商店购买：${SEED_PACK_PRICE} 金一包，共 ${SEED_PACK_AMOUNT} 粒。知识多由学者研读获得，用于职业升级与建筑升级。`,
      '药品只用于治病，不能当饭吃。',
    ],
  },
  {
    id: 'careers',
    title: '猫咪与职业',
    paragraphs: [
      `可编制职业：${roleList}。散民闲逛待分配。`,
      '商店「猫咪」页的职业编制：+ 从散民就任，− 解除回散民；就任与解除均不消耗知识。没有散民时须先 − 解除其他职业。',
      `职业等级最高 Lv.${ROLE_MAX_LEVEL}。每升一级产能约 +${yieldPct}%，日耗约 +${consumePct}%。升级耗知识，例如升到 Lv.2 需 ${ROLE_UPGRADE_KNOWLEDGE[2]} 知识。`,
      '农夫耕田、矿工采矿、伐木工砍树、渔夫钓鱼、学者研读、船商参与贸易加成、医生炼药。生病时会停工，需用药治愈。',
    ],
  },
  {
    id: 'farm',
    title: '农田与粮仓',
    paragraphs: [
      `农田为 ${FARM_SIZE}×${FARM_SIZE} 格。农夫会翻地、播种、浇水照料；成熟小麦可收入囊或送入粮仓。`,
      `粮仓最高 Lv.${GRANARY_MAX_LEVEL}。每日库存会自然损耗约 ${GRANARY_DAILY_DECAY}；损坏后可用 ${GRANARY_REPAIR_COST} 金维修，恢复约 ${GRANARY_REPAIR_AMOUNT} 耐久。`,
      '麦种告罄的可种植季会增加生病与走失风险，记得补种。',
    ],
  },
  {
    id: 'buildings',
    title: '建筑升级',
    paragraphs: [
      `小屋最高 Lv.${COTTAGE_MAX_LEVEL}，猫口上限由 Lv.1 的 ${catCapForCottage(1)} 只到满级 ${catCapForCottage(COTTAGE_MAX_LEVEL)} 只。`,
      `码头最高 Lv.${HARBOR_MAX_LEVEL}（影响出海售价与冷却）；货船最高 Lv.${BOAT_MAX_LEVEL}（影响装货与航程）。`,
      `升级耗金币、矿、木、知识，具体价格见商店。例如小屋升到 Lv.2 需 ${COTTAGE_UPGRADE_PRICE[2]} 金（另加矿木知识）。`,
    ],
  },
  {
    id: 'voyage',
    title: '出海贸易',
    paragraphs: [
      `需有健康船商，且约在白天 7–18 点、船在港且冷却结束。货船 Lv.1 最多装鱼 ${BOAT_FISH_CAP[1]}、木 ${BOAT_WOOD_CAP[1]}；有货才能出航。`,
      `Lv.1 约航行 ${voyageHours} 小时游戏时间，回港后码头冷却约 ${cooldownHours} 小时（等级越高越快）。回港结算金币，偶有药品。`,
      '船商等级会提高贸易售价加成。季节目标里的「出航次数」在成功回港时累计；「收获」「伐木」在对应行动成功时累计。',
    ],
  },
  {
    id: 'survival',
    title: '生病与全灭',
    paragraphs: [
      `日结优先用药自动治愈生病猫（每只用 1 药）。无药则继续带病，头顶会一直显示「病」标。日耗鱼肉与猫数、职业等级有关（基础约每猫 ${FISH_DAILY_PER_CAT}）。`,
      '鱼严重短缺或麦种长期告罄时，可能饿死/走失。户外职业生病概率略高。',
      '猫全部消失即全灭，可重新开始一局。',
    ],
  },
  {
    id: 'shop',
    title: '商店与编制',
    paragraphs: [
      '左下角「商店」可折叠：物品 / 回收 / 建筑 / 猫咪 四个分页；旁边「说明」可打开说明书。',
      '物品：种子、零食、玩具等。回收：折价出售小麦、矿石、木材、鱼肉换金币（低于码头/出海价）；鱼肉会预留明日口粮。建筑：粮仓、小屋、码头、货船。猫咪：买猫、职业编制、职业升级。',
      `回收基价约：${SELL_LABEL.wheat} ${SELL_BASE_PRICE.wheat} 金、${SELL_LABEL.ore} ${SELL_BASE_PRICE.ore} 金、${SELL_LABEL.wood} ${SELL_BASE_PRICE.wood} 金、${SELL_LABEL.fish} ${SELL_BASE_PRICE.fish} 金；有健康船商时单价略升。急用钱或清仓可用，正经赚钱仍靠码头卖麦、商船与出海。`,
      '职业编制在猫咪页；有散民即可免费 + 就任，− 解除也免费。',
    ],
  },
]
