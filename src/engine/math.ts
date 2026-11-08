export class Vec2 {
  constructor(public x = 0, public y = 0) {}
  clone(): Vec2 { return new Vec2(this.x, this.y); }
  add(other: Vec2): Vec2 { return new Vec2(this.x + other.x, this.y + other.y); }
  subtract(other: Vec2): Vec2 { return new Vec2(this.x - other.x, this.y - other.y); }
  scale(value: number): Vec2 { return new Vec2(this.x * value, this.y * value); }
}

export class Vec3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
  clone(): Vec3 { return new Vec3(this.x, this.y, this.z); }
  add(other: Vec3): Vec3 { return new Vec3(this.x + other.x, this.y + other.y, this.z + other.z); }
  subtract(other: Vec3): Vec3 { return new Vec3(this.x - other.x, this.y - other.y, this.z - other.z); }
  scale(value: number): Vec3 { return new Vec3(this.x * value, this.y * value, this.z * value); }
  dot(other: Vec3): number { return this.x * other.x + this.y * other.y + this.z * other.z; }
  cross(other: Vec3): Vec3 {
    return new Vec3(this.y * other.z - this.z * other.y, this.z * other.x - this.x * other.z, this.x * other.y - this.y * other.x);
  }
  normalized(): Vec3 {
    const length = Math.hypot(this.x, this.y, this.z) || 1;
    return new Vec3(this.x / length, this.y / length, this.z / length);
  }
}
