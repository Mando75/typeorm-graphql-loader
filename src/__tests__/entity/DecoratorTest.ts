import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Field, Int, ObjectType } from "type-graphql";
import { ConfigureLoader } from "../../";
import { Author } from "./Author";

@ObjectType()
@Entity()
export class DecoratorTest extends BaseEntity {
  @Field((type) => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field({ nullable: true })
  @Column("varchar", { nullable: false })
  @ConfigureLoader({ ignore: true })
  ignoredField?: string;

  @Column("varchar", { nullable: false })
  @Field()
  @ConfigureLoader({ required: true })
  requiredField!: string;

  @OneToOne((type) => Author)
  @JoinColumn()
  @Field((type) => Author)
  @ConfigureLoader({ required: true })
  requiredRelation!: Author;

  @OneToOne((type) => Author)
  @JoinColumn()
  @Field((type) => Author, { nullable: true })
  @ConfigureLoader({ ignore: true })
  ignoredRelation?: Author;

  @Field()
  @CreateDateColumn()
  createdAt!: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt!: Date;
}
