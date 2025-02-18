import C from '/include/constants'
import sum from 'lodash-es/sum'
import values from 'lodash-es/values'

export default {
  builder (target, cache = {}) {
    if (!cache.work) {
      cache.work = this.creep.getActiveBodyparts(C.WORK)
    }
    target = { x: 25, y: 25, roomName: target }
    let tgt = this.resolveTarget(target)
    if (this.creep.pos.roomName !== tgt.roomName) {
      this.push('moveToRoom', tgt)
      return this.runStack()
    }
    let { room, pos } = this.creep
    if (this.creep.carry.energy) {
      this.status = 'Looking for target'
      let sites = room.find(C.FIND_MY_CONSTRUCTION_SITES)
      if (!sites.length) return
      let site = pos.findClosestByRange(sites)
      let hitsMax = Math.ceil(this.creep.carry.energy / (cache.work * C.BUILD_POWER))
      this.push('repeat', hitsMax, 'build', site.id)
      this.push('moveInRange', site.id, 3)
      this.runStack()
    } else {
      this.status = 'Looking for energy'
      let tgt = room.storage || room.containers.find(c => c.store.energy) || room.structures[STRUCTURE_SPAWN] && room.structures[STRUCTURE_SPAWN][0]
      if (room.storage && room.storage.store.energy < 1000) {
        let { x, y, roomName } = room.storage.pos
        this.push('repeat',5,'flee', [{ pos: { x, y, roomName }, range: 5 }])
        return this.runStack()
      }
      if (tgt) {
        if (tgt.structureType === STRUCTURE_SPAWN && this.spawn.queueLength) {
          this.push('sleep', 5)
          return this.runStack()
        }
        this.push('withdraw', tgt.id, C.RESOURCE_ENERGY)
        this.push('moveNear', tgt.id)
        return this.runStack()
      }
    }
  },
  buildAt (type, target, opts = {}) {
    if (!opts.work) {
      opts.work = this.creep.getActiveBodyparts(C.WORK)
    }
    const tgt = this.resolveTarget(target)
    if (this.creep.carry.energy) {
      let [site] = tgt.lookFor(C.LOOK_CONSTRUCTION_SITES)
      if (!site) {
        let [struct] = tgt.lookFor(C.LOOK_STRUCTURES, {
          filter: (s) => s.structureType === type
        })
        if (struct) { // Structure exists/was completed
          this.pop()
          return this.runStack()
        }
        this.creep.say('CSITE')
        return tgt.createConstructionSite(type)
      }
      let hitsMax = Math.ceil(sum(values(this.creep.carry)) / (opts.work * C.BUILD_POWER))
      this.push('repeat', hitsMax, 'build', site.id)
      this.runStack()
    } else {
      if (opts.energyState) {
        this.push(...opts.energyState)
        this.runStack()
      } else {
        this.creep.say('T:BLD GTHR')
        this.pop()
      }
    }
  },
  store (res,cache = {}) {
    if (!cache.work) {
      cache.work = this.creep.getActiveBodyparts(C.WORK)
    }
    if (!this.creep.carry[res]) {
      this.pop()
      return this.runStack()
    }
    if (cache.work) {
      const road = this.creep.pos.lookFor(C.LOOK_STRUCTURES).find(s => s.structureType === C.STRUCTURE_ROAD)
      if (road && road.hits <= road.hitsMax < 100) {
        this.creep.repair(road)
      }
      let cs = this.pos.lookFor(C.LOOK_CONSTRUCTION_SITES).find(s=>s.structureType === C.STRUCTURE_ROAD)
      if (cs) {
        return this.build(cs)
      }
    }
    let tgt = this.creep.room.storage || (res === C.RESOURCE_ENERGY && this.creep.room.spawns.find(s => s.energy < s.energyCapacity) || this.creep.room.extensions.find(s => s.energy < s.energyCapacity))
    if (tgt) {
      this.push('transfer', tgt.id, res)
      this.push('moveNear', tgt.id)
      return this.runStack()
    }
  }
}
