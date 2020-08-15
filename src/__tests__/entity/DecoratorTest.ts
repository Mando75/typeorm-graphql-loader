import {
  CreateDateColumn,
  Column,
  BaseEntity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Entity
} from "typeorm";
import { Field, ObjectType, Int} from "type-graphql";
import {ConfigureLoader} from "../../";

@ObjectType()
@Entity()
export class DecoratorTest extends BaseEntity {
  @Field(type => Int)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column("varchar", {nullable: false})
  @ConfigureLoader({ignore: true})
  ignoredField!: string;

  @Column("varchar", {nullable: false})
  @ConfigureLoader({required: true})
  requiredField!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
